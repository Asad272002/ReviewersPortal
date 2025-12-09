$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3002'

function Get-VotingDurationDays {
  $settings = Invoke-RestMethod -Method Get -Uri ($base + '/api/admin/voting-settings')
  $s = ($settings.settings | Where-Object { $_.settingKey -eq 'voting_duration_days' } | Select-Object -First 1)
  if (-not $s) { throw 'voting_duration_days setting not found' }
  return [int]$s.settingValue
}

Write-Host 'Step 1: Fetch current voting settings'
$orig = Get-VotingDurationDays
Write-Host ('Original voting_duration_days = ' + $orig)

# Step 2: Submit Proposal A (before change)
$ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$titleA = 'Validation Proposal A ' + $ts
$bodyA = @{ 
  reviewerName = 'Validator'
  proposalTitle = $titleA
  projectCategory = 'development'
  teamSize = '2-5'
  budgetEstimate = '1000'
  timelineWeeks = '4'
  proposalSummary = 'Test submission to validate voting duration before change.'
  technicalApproach = 'Use simple steps to verify deadlines.'
  additionalNotes = 'N/A'
} | ConvertTo-Json -Depth 5

Write-Host 'Step 2: Submit Proposal A'
$submitA = Invoke-RestMethod -Method Post -Uri ($base + '/api/submit-proposal') -ContentType 'application/json' -Body $bodyA
Write-Host ('Submitted A at: ' + $submitA.data.submittedAt)

# Step 3: Fetch proposals and locate A (retry for eventual consistency)
Write-Host 'Step 3: Fetch proposals and locate Proposal A'
$propA = $null
for ($i = 0; $i -lt 30; $i++) {
  $proposals1 = Invoke-RestMethod -Method Get -Uri ($base + '/api/voting/proposals') -Headers @{ 'Cache-Control' = 'no-cache'; 'Pragma' = 'no-cache' }
  $propA = $proposals1.proposals | Where-Object { $_.proposalTitle -eq $titleA } | Select-Object -First 1
  if ($propA) { break }
  Start-Sleep -Seconds 1
}
if (-not $propA) { throw 'Proposal A not found in proposals list after retries' }
$durationA_days = [math]::Round(((Get-Date $propA.votingDeadline) - (Get-Date $propA.submissionDate)).TotalDays)
Write-Host ('Proposal A duration days observed: ' + $durationA_days)

# Step 4: Change voting duration to a distinctly different value
$newDur = if ($orig -ge 15) { $orig - 10 } else { $orig + 10 }
if ($newDur -lt 1) { $newDur = 1 }
if ($newDur -gt 365) { $newDur = 365 }
Write-Host ('Step 4: Update voting_duration_days to ' + $newDur)
$putBody = @{ settingKey = 'voting_duration_days'; settingValue = $newDur.ToString() } | ConvertTo-Json
$updateResp = Invoke-RestMethod -Method Put -Uri ($base + '/api/admin/voting-settings') -ContentType 'application/json' -Body $putBody
Write-Host ('Update response: ' + $updateResp.message)

# Verify settings updated
$cur = Get-VotingDurationDays
Write-Host ('Current voting_duration_days after update = ' + $cur)

# Step 5: Re-fetch proposals and ensure Proposal A deadline unchanged (retry)
Write-Host 'Step 5: Re-fetch proposals to verify Proposal A deadline unchanged'
$propA2 = $null
for ($i = 0; $i -lt 30; $i++) {
  $proposals2 = Invoke-RestMethod -Method Get -Uri ($base + '/api/voting/proposals') -Headers @{ 'Cache-Control' = 'no-cache'; 'Pragma' = 'no-cache' }
  $propA2 = $proposals2.proposals | Where-Object { $_.proposalTitle -eq $titleA } | Select-Object -First 1
  if ($propA2) { break }
  Start-Sleep -Seconds 1
}
if (-not $propA2) { throw 'Proposal A not found after settings change (after retries)' }
$durationA2_days = [math]::Round(((Get-Date $propA2.votingDeadline) - (Get-Date $propA2.submissionDate)).TotalDays)
Write-Host ('Proposal A duration days after change: ' + $durationA2_days)

# Step 6: Submit Proposal B (after change)
$ts2 = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$titleB = 'Validation Proposal B ' + $ts2
$bodyB = @{ 
  reviewerName = 'Validator'
  proposalTitle = $titleB
  projectCategory = 'development'
  teamSize = '2-5'
  budgetEstimate = '1000'
  timelineWeeks = '4'
  proposalSummary = 'Test submission to validate voting duration after change.'
  technicalApproach = 'Use simple steps to verify deadlines.'
  additionalNotes = 'N/A'
} | ConvertTo-Json -Depth 5

Write-Host 'Step 6: Submit Proposal B'
$submitB = Invoke-RestMethod -Method Post -Uri ($base + '/api/submit-proposal') -ContentType 'application/json' -Body $bodyB
Write-Host ('Submitted B at: ' + $submitB.data.submittedAt)

# Step 7: Fetch proposals and locate B (retry for eventual consistency)
Write-Host 'Step 7: Fetch proposals and locate Proposal B'
$propB = $null
for ($i = 0; $i -lt 30; $i++) {
  $proposals3 = Invoke-RestMethod -Method Get -Uri ($base + '/api/voting/proposals') -Headers @{ 'Cache-Control' = 'no-cache'; 'Pragma' = 'no-cache' }
  $propB = $proposals3.proposals | Where-Object { $_.proposalTitle -eq $titleB } | Select-Object -First 1
  if ($propB) { break }
  Start-Sleep -Seconds 1
}
if (-not $propB) { throw 'Proposal B not found in proposals list after retries' }
$durationB_days = [math]::Round(((Get-Date $propB.votingDeadline) - (Get-Date $propB.submissionDate)).TotalDays)
Write-Host ('Proposal B duration days observed: ' + $durationB_days)

# Assertions
$okA = ($durationA2_days -eq $durationA_days)
$okB = ($durationB_days -eq $cur)

Write-Host '--- Summary ---'
Write-Host ('Original duration: ' + $orig)
Write-Host ('Updated duration:  ' + $cur)
Write-Host ('Proposal A duration before: ' + $durationA_days + '; after change: ' + $durationA2_days + ' (unchanged = ' + $okA + ')')
Write-Host ('Proposal B duration: ' + $durationB_days + ' (matches updated = ' + $okB + ')')

if (-not $okA) { throw 'FAIL: Proposal A duration changed after settings update (should be locked).'}
if (-not $okB) { throw 'FAIL: Proposal B duration does not match updated settings.'}

Write-Host 'RESULT: PASS — Pre-change proposals unchanged, post-change proposals use new duration.'