-- Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_config JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Public read access for organizations" ON public.organizations
    FOR SELECT USING (true);

-- Insert initial organization with Hyperon-RFP projects
INSERT INTO public.organizations (name, description, project_config)
VALUES (
    'Hyperon-RFP',
    'Organization for Hyperon RFP projects',
    '[
        {"code": "DFRFP1-1", "name": "Unsupervised Learning"},
        {"code": "DFRFP1-2", "name": "Ternary Sheaf Network"},
        {"code": "DFRFP1-3", "name": "Direct the MOSES Evolutionary Exploration via LLMs"},
        {"code": "DFRFP1-4", "name": "Evolving DNN Architectures"},
        {"code": "DFRFP1-5", "name": "Procedurally Generated Interactive Experience"},
        {"code": "DFRFP1-6", "name": "Neurosymbolics from Chaos in Language Models"},
        {"code": "DFRFP1-7", "name": "Large MeTTa corpus for LLM fine-tuning"},
        {"code": "DFRFP1-8", "name": "MeTTa Demo: Sequence Learning"},
        {"code": "DFRFP1-9", "name": "Knowledge Graph Workflows"},
        {"code": "DFRFP1-10", "name": "From Classical AGI on Quantum HW to Native QAGI"},
        {"code": "DFRFP1-11", "name": "SYNAPSE: Systematic Neural-Symbolic Attn and Eval"},
        {"code": "DFRFP1-12", "name": "Design for Cryptocurrency Mining and AI Processing"},
        {"code": "DFRFP1-13", "name": "TxPipe MultiParty Escrow"},
        {"code": "DFRFP1-14", "name": "Golang SingularityNET SDK"},
        {"code": "DFRFP1-15", "name": "Chimera: Evolving Software"},
        {"code": "DFRFP1-16", "name": "Neurotech Controls for AGI Motivational Framework"},
        {"code": "DFRFP1-17", "name": "Modular Adaptive Goal and Utility System (MAGUS)"},
        {"code": "PRFP-1", "name": "Reputo"},
        {"code": "PRFP-2", "name": "Decentralized Digital Identity (DDI) Research"},
        {"code": "DFRFP-18", "name": "XenoCog: Pioneering Alien & Octopus-inspired A"},
        {"code": "DFRFP-19", "name": "Interactional Motivation (IM)"},
        {"code": "DFRFP-20", "name": "Quantum Computing Intelligence and Applications"},
        {"code": "DFRFP-21", "name": "Temporal Computing"},
        {"code": "DFRFP-22", "name": "Hetzerk: a logical language of AI and Physics"},
        {"code": "DFRFP-23", "name": "Pattern Discovery in Symbolic Visual Structures"},
        {"code": "DFRFP-24", "name": "Hetzerk: AGI Reasoning and Decentralized Science"},
        {"code": "DFRFP-25", "name": "Natural Language Explainability for Temporal KGs"},
        {"code": "DFRFP-26", "name": "Dynamic KG Algorithms for Evolving AGI Systems"},
        {"code": "DFRFP-27", "name": "Augmenting BMKGs With Cheminformatics And CADD"},
        {"code": "DFRFP-28", "name": "Autograph: Factoring Knowledge Graphs into Frames"}
    ]'::jsonb
);
