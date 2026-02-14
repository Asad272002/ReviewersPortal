#!/bin/bash

# OAuth2/OIDC Client Manager for Hydra (Public API)
# This script helps manage OAuth2 clients and test OAuth flows
# Uses OAuth2 Dynamic Client Registration (RFC 7591) via public endpoint

set -e  # Exit on error

# Configuration
HYDRA_SERVICE_URL="http://ephemeral-featur-deep-sso-317772201.eu-west-2.elb.amazonaws.com"
DEFAULT_REDIRECT_URI="${DEFAULT_REDIRECT_URI:-http://127.0.0.1:4300/oauth/callback}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

check_dependencies() {
    local missing_deps=()
    
    for cmd in curl jq openssl; do
        if ! command -v $cmd &> /dev/null; then
            missing_deps+=($cmd)
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_info "Please install them and try again."
        exit 1
    fi
}

check_hydra() {
    print_info "Checking Hydra connectivity..."

    # Check Public API via OIDC discovery endpoint
    # Note: We use /.well-known/openid-configuration instead of /health/alive
    # because the ALB routes /.well-known/* to Hydra, while /health/* may go elsewhere
    if ! curl -s -f "${HYDRA_SERVICE_URL}/.well-known/openid-configuration" > /dev/null 2>&1; then
        print_error "Cannot connect to Hydra Public API at ${HYDRA_SERVICE_URL}"
        print_info "Make sure Hydra is running and accessible."
        print_info "Tried: ${HYDRA_SERVICE_URL}/.well-known/openid-configuration"
        exit 1
    fi

    print_success "Hydra is accessible"
}

create_client() {
    local client_name="$1"
    local client_type="$2"  # "public" or "confidential"
    local redirect_uris="$3"
    local client_uri="$4"
    local logo_uri="$5"
    local policy_uri="$6"
    local tos_uri="$7"

    print_section "Creating OAuth2 Client (Dynamic Registration)"

    # Validate required fields
    if [ -z "$client_name" ]; then
        print_error "Client name is required"
        print_info "Usage: $0 create <name> <type> <redirect_uris> <client_uri> [logo_uri] [policy_uri] [tos_uri]"
        exit 1
    fi

    if [ -z "$client_uri" ]; then
        print_error "Client URI (homepage) is required"
        print_info "Usage: $0 create <name> <type> <redirect_uris> <client_uri> [logo_uri] [policy_uri] [tos_uri]"
        exit 1
    fi

    # Parse redirect URIs (comma-separated)
    IFS=',' read -ra URIS <<< "$redirect_uris"
    local redirect_json=$(printf '%s\n' "${URIS[@]}" | jq -R . | jq -s .)

    local auth_method="none"
    if [ "$client_type" = "confidential" ]; then
        auth_method="client_secret_basic"
    fi

    print_info "Client Name: $client_name"
    print_info "Client Type: $client_type"
    print_info "Auth Method: $auth_method"
    print_info "Client URI: $client_uri"
    print_info "Redirect URIs: ${URIS[*]}"
    [ -n "$logo_uri" ] && print_info "Logo URI: $logo_uri"
    [ -n "$policy_uri" ] && print_info "Policy URI: $policy_uri"
    [ -n "$tos_uri" ] && print_info "ToS URI: $tos_uri"

    # Build optional metadata JSON
    local metadata=""
    [ -n "$logo_uri" ] && metadata="$metadata\"logo_uri\": \"$logo_uri\","
    [ -n "$policy_uri" ] && metadata="$metadata\"policy_uri\": \"$policy_uri\","
    [ -n "$tos_uri" ] && metadata="$metadata\"tos_uri\": \"$tos_uri\","

    # Create the client using public OAuth2 Dynamic Client Registration (RFC 7591)
    local response=$(curl -s -X POST "${HYDRA_SERVICE_URL}/oauth2/register" \
        -H "Content-Type: application/json" \
        -d '{
            "client_name": "'"$client_name"'",
            "client_uri": "'"$client_uri"'",
            '"$metadata"'
            "grant_types": ["authorization_code", "refresh_token"],
            "response_types": ["code", "id_token"],
            "scope": "openid profile email username offline_access",
            "redirect_uris": '"$redirect_json"',
            "token_endpoint_auth_method": "'"$auth_method"'"
        }')
    
    # Check if creation was successful
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Failed to create client"
        echo "$response" | jq .
        exit 1
    fi
    
    local client_id=$(echo "$response" | jq -r '.client_id')
    local client_secret=$(echo "$response" | jq -r '.client_secret // empty')
    
    print_success "Client created successfully!"
    echo ""
    print_info "Client ID: ${GREEN}$client_id${NC}"
    
    if [ -n "$client_secret" ]; then
        print_info "Client Secret: ${GREEN}$client_secret${NC}"
    else
        print_info "Client Secret: ${YELLOW}None (Public Client)${NC}"
    fi
    
    # Fetch OIDC discovery endpoints
    print_info "Fetching OIDC discovery endpoints..."
    local discovery=$(curl -s "${HYDRA_SERVICE_URL}/.well-known/openid-configuration")

    # Save to file with full metadata and OIDC endpoints
    local creds_file="./oauth-clients/${client_name}.json"
    mkdir -p ./oauth-clients

    # Combine client response with OIDC endpoints
    echo "$response" | jq --argjson discovery "$discovery" '{
        client_id,
        client_secret,
        client_name,
        client_uri,
        logo_uri,
        policy_uri,
        tos_uri,
        redirect_uris,
        grant_types,
        response_types,
        scope,
        token_endpoint_auth_method,
        registration_access_token,
        registration_client_uri,
        created_at: (now | strftime("%Y-%m-%d %H:%M:%S")),
        oidc_endpoints: {
            issuer: $discovery.issuer,
            authorization_endpoint: $discovery.authorization_endpoint,
            token_endpoint: $discovery.token_endpoint,
            userinfo_endpoint: $discovery.userinfo_endpoint,
            jwks_uri: $discovery.jwks_uri,
            revocation_endpoint: $discovery.revocation_endpoint,
            introspection_endpoint: $discovery.introspection_endpoint,
            end_session_endpoint: $discovery.end_session_endpoint
        }
    }' > "$creds_file"

    print_success "Credentials saved to: $creds_file"
    
    # Export for use in other functions
    export CLIENT_ID="$client_id"
    export CLIENT_SECRET="$client_secret"
}

list_clients() {
    print_section "OAuth2 Clients"
    
    print_info "Showing locally saved clients from ./oauth-clients directory:"
    echo ""
    
    if [ ! -d "./oauth-clients" ] || [ -z "$(ls -A ./oauth-clients 2>/dev/null)" ]; then
        print_info "No local client credentials found."
        print_info "Create a client first using: $0 create <name> <type>"
        return
    fi
    
    echo "$(printf '%-40s %-30s %-20s' 'CLIENT ID' 'NAME' 'AUTH METHOD')"
    echo "────────────────────────────────────────────────────────────────────────────────────────"
    
    for file in ./oauth-clients/*.json; do
        if [ -f "$file" ]; then
            local client_id=$(jq -r '.client_id' "$file")
            local client_name=$(jq -r '.client_name' "$file")
            local auth_method=$(jq -r '.token_endpoint_auth_method' "$file")
            printf "%-40s %-30s %-20s\n" "$client_id" "$client_name" "$auth_method"
        fi
    done
}

# Get client details (from local storage)
get_client() {
    local client_id="$1"
    
    if [ -z "$client_id" ]; then
        print_error "Client ID is required"
        exit 1
    fi
    
    print_section "Client Details: $client_id"
    
    # Find the client in local storage
    local creds_file=$(find ./oauth-clients -name "*.json" -exec grep -l "\"client_id\": \"$client_id\"" {} \; 2>/dev/null | head -n 1)
    
    if [ -z "$creds_file" ]; then
        print_error "Client not found in local storage"
        print_info "Note: Client details are only available for locally created clients"
        print_info "The public API does not support arbitrary client lookups"
        exit 1
    fi
    
    cat "$creds_file" | jq .
}

# Delete a client (local storage only)
delete_client() {
    local client_id="$1"
    
    if [ -z "$client_id" ]; then
        print_error "Client ID is required"
        exit 1
    fi
    
    print_warning "Deleting client from local storage: $client_id"
    print_info "Note: This only removes the local credentials file"
    print_info "To delete from Hydra, you need the registration_access_token or admin API access"
    echo ""
    
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Cancelled"
        exit 0
    fi
    
    # Find and delete the local credentials file
    local creds_file=$(find ./oauth-clients -name "*.json" -exec grep -l "\"client_id\": \"$client_id\"" {} \; 2>/dev/null | head -n 1)
    
    if [ -z "$creds_file" ]; then
        print_error "Client not found in local storage"
        exit 1
    fi
    
    rm -f "$creds_file"
    print_success "Client credentials removed from local storage"
}

# Start OAuth2 authorization code flow
start_auth_flow() {
    local client_id="${1:-$CLIENT_ID}"
    local redirect_uri="${2:-$DEFAULT_REDIRECT_URI}"
    
    if [ -z "$client_id" ]; then
        print_error "Client ID is required"
        exit 1
    fi
    
    print_section "Starting Authorization Code Flow (PKCE)"
    
    # Generate PKCE challenge
    CODE_VERIFIER=$(openssl rand -base64 64 | tr '+/' '-_' | tr -d '=[:space:]')
    CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | openssl base64 | tr '+/' '-_' | tr -d '=[:space:]')
    
    # Build authorization URL
    local auth_url="${HYDRA_SERVICE_URL}/oauth2/auth"
    auth_url="${auth_url}?response_type=code"
    auth_url="${auth_url}&client_id=${client_id}"
    auth_url="${auth_url}&redirect_uri=$(printf %s "$redirect_uri" | jq -sRr @uri)"
    auth_url="${auth_url}&scope=openid%20profile%20email%20username%20offline_access"
    auth_url="${auth_url}&state=state-$(date +%s)"
    auth_url="${auth_url}&nonce=nonce-$(date +%s)"
    auth_url="${auth_url}&code_challenge=${CODE_CHALLENGE}"
    auth_url="${auth_url}&code_challenge_method=S256"
    
    print_info "Authorization URL:"
    echo ""
    echo -e "${GREEN}${auth_url}${NC}"
    echo ""
    
    print_warning "Next steps:"
    echo "  1. Open the URL above in your browser"
    echo "  2. Complete the login/consent flow"
    echo "  3. Copy the 'code' parameter from the redirect URL"
    echo "  4. Run: $0 exchange-token <CLIENT_ID> <AUTH_CODE>"
    echo ""
    
    # Try to open in browser (macOS)
    if command -v open &> /dev/null; then
        read -p "Open in browser now? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            open "$auth_url"
        fi
    fi
    
    # Save code verifier for later use
    echo "$CODE_VERIFIER" > /tmp/oauth_code_verifier_${client_id}
    print_info "Code verifier saved to /tmp/oauth_code_verifier_${client_id}"
}

# Exchange authorization code for tokens
exchange_token() {
    local client_id="${1:-$CLIENT_ID}"
    local auth_code="$2"
    local redirect_uri="${3:-$DEFAULT_REDIRECT_URI}"
    
    if [ -z "$client_id" ] || [ -z "$auth_code" ]; then
        print_error "Client ID and authorization code are required"
        print_info "Usage: $0 exchange-token <CLIENT_ID> <AUTH_CODE> [REDIRECT_URI]"
        exit 1
    fi
    
    print_section "Exchanging Authorization Code for Tokens"
    
    # Try to load code verifier
    local verifier_file="/tmp/oauth_code_verifier_${client_id}"
    if [ -f "$verifier_file" ]; then
        CODE_VERIFIER=$(cat "$verifier_file")
        print_success "Loaded code verifier"
    else
        print_error "Code verifier not found. Did you run 'start-auth-flow' first?"
        exit 1
    fi
    
    # Check if we have a client secret (for confidential clients)
    local client_secret=""
    local creds_file=$(find ./oauth-clients -name "*.json" -exec grep -l "\"client_id\": \"$client_id\"" {} \; 2>/dev/null | head -n 1)
    
    if [ -n "$creds_file" ]; then
        client_secret=$(jq -r '.client_secret // empty' "$creds_file")
    fi
    
    print_info "Client ID: $client_id"
    print_info "Redirect URI: $redirect_uri"
    
    # Build token request
    local token_data="grant_type=authorization_code"
    token_data="${token_data}&code=${auth_code}"
    token_data="${token_data}&redirect_uri=${redirect_uri}"
    token_data="${token_data}&code_verifier=${CODE_VERIFIER}"
    
    local response
    if [ -n "$client_secret" ]; then
        print_info "Using client secret authentication"
        response=$(curl -s -X POST "${HYDRA_SERVICE_URL}/oauth2/token" \
            -u "${client_id}:${client_secret}" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "$token_data")
    else
        print_info "Using public client authentication"
        token_data="${token_data}&client_id=${client_id}"
        response=$(curl -s -X POST "${HYDRA_SERVICE_URL}/oauth2/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "$token_data")
    fi
    
    # Check for errors
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Token exchange failed"
        echo "$response" | jq .
        exit 1
    fi
    
    print_success "Tokens received!"
    echo ""
    echo "$response" | jq .
    
    # Save tokens
    local access_token=$(echo "$response" | jq -r '.access_token')
    echo "$access_token" > /tmp/oauth_access_token_${client_id}
    
    print_info "Access token saved to /tmp/oauth_access_token_${client_id}"
    
    # Clean up code verifier
    rm -f "$verifier_file"
}

# Get user info using access token
get_userinfo() {
    local client_id="${1:-$CLIENT_ID}"
    local access_token="$2"
    
    if [ -z "$access_token" ]; then
        # Try to load from file
        local token_file="/tmp/oauth_access_token_${client_id}"
        if [ -f "$token_file" ]; then
            access_token=$(cat "$token_file")
            print_success "Loaded access token"
        else
            print_error "Access token is required"
            print_info "Usage: $0 userinfo <CLIENT_ID> [ACCESS_TOKEN]"
            exit 1
        fi
    fi
    
    print_section "User Info"
    
    local response=$(curl -s "${HYDRA_SERVICE_URL}/userinfo" \
        -H "Authorization: Bearer ${access_token}")
    
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        print_error "Failed to get user info"
        echo "$response" | jq .
        exit 1
    fi
    
    echo "$response" | jq .
}

# Show usage
show_usage() {
    cat <<EOF
OAuth2/OIDC Client Manager for Hydra (Public API)

Usage: $0 <command> [arguments]

Commands:
  create <name> <type> <redirect_uris> <client_uri> [logo_uri] [policy_uri] [tos_uri]
      Create a new OAuth2 client using Dynamic Client Registration (RFC 7591)
      - name: Client name (required)
      - type: "public" or "confidential"
      - redirect_uris: Comma-separated list of redirect URIs
      - client_uri: Homepage URL of the client application (required)
      - logo_uri: URL to the client's logo image (optional)
      - policy_uri: URL to the client's privacy policy (optional)
      - tos_uri: URL to the client's terms of service (optional)

      Example: $0 create "My App" confidential "http://localhost:3000/callback" "https://myapp.com" "https://myapp.com/logo.png" "https://myapp.com/privacy" "https://myapp.com/tos"

  list
      List OAuth2 clients from local storage
      Note: Only shows clients created with this script

  get <client_id>
      Get details for a specific client from local storage
      Note: Only available for locally created clients

  delete <client_id>
      Delete client credentials from local storage
      Note: Does not delete from Hydra (requires admin API or registration_access_token)

  start-auth-flow <client_id> [redirect_uri]
      Start the OAuth2 authorization code flow
      Opens browser and generates PKCE challenge

  exchange-token <client_id> <auth_code> [redirect_uri]
      Exchange authorization code for access token

  userinfo <client_id> [access_token]
      Get user info using access token

  test-flow <name> <type> [redirect_uris]
      Complete flow: create client and start auth flow
      
      Example: $0 test-flow my-test-app public

Environment Variables:
  HYDRA_SERVICE_URL    Hydra public URL (default: http://127.0.0.1:4444)
  DEFAULT_REDIRECT_URI Default redirect URI (default: http://127.0.0.1:4300/oauth/callback)

Examples:
  # Create a public client with required metadata
  $0 create "My Public App" public "http://localhost:3000/callback" "https://myapp.com"

  # Create a confidential client with all metadata
  $0 create "My App" confidential "http://localhost:3000/callback" "https://myapp.com" \\
      "https://myapp.com/logo.png" "https://myapp.com/privacy" "https://myapp.com/tos"

  # List all locally saved clients
  $0 list

  # Complete test flow (for quick testing)
  $0 test-flow "Demo App" public "http://127.0.0.1:4300/oauth/callback" "http://localhost:4300"
  # Then follow the prompts to complete the OAuth flow

Note: This script uses Hydra's public OAuth2 Dynamic Client Registration endpoint
      (/oauth2/register) per RFC 7591. Admin API operations are not supported.
      Client management operations (list/get/delete) work with locally saved credentials.

EOF
}

# Main command dispatcher
main() {
    check_dependencies
    
    local command="${1:-help}"
    shift || true
    
    case "$command" in
        create)
            # check_hydra
            local name="${1:-}"
            local type="${2:-public}"
            local redirect_uris="${3:-$DEFAULT_REDIRECT_URI}"
            local client_uri="${4:-}"
            local logo_uri="${5:-}"
            local policy_uri="${6:-}"
            local tos_uri="${7:-}"
            create_client "$name" "$type" "$redirect_uris" "$client_uri" "$logo_uri" "$policy_uri" "$tos_uri"
            ;;
        list)
            check_hydra
            list_clients
            ;;
        get)
            check_hydra
            get_client "$1"
            ;;
        delete)
            check_hydra
            delete_client "$1"
            ;;
        start-auth-flow)
            check_hydra
            start_auth_flow "$1" "$2"
            ;;
        exchange-token)
            check_hydra
            exchange_token "$1" "$2" "$3"
            ;;
        userinfo)
            check_hydra
            get_userinfo "$1" "$2"
            ;;
        test-flow)
            check_hydra
            local name="${1:-test-app-$(date +%s)}"
            local type="${2:-public}"
            local redirect_uris="${3:-$DEFAULT_REDIRECT_URI}"
            local client_uri="${4:-http://localhost:3000}"
            local logo_uri="${5:-}"
            local policy_uri="${6:-}"
            local tos_uri="${7:-}"
            create_client "$name" "$type" "$redirect_uris" "$client_uri" "$logo_uri" "$policy_uri" "$tos_uri"
            echo ""
            read -p "Press Enter to start authorization flow..."
            start_auth_flow "$CLIENT_ID" "${redirect_uris%%,*}"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
