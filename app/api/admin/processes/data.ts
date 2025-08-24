// Shared data for process documents - in a real app, this would come from a database
export let processes = [
  {
    id: '1',
    title: 'Review Proposal Workflow',
    description: 'Standard workflow for reviewing and approving proposals',
    content: 'This document outlines the complete workflow for reviewing proposals from submission to final approval. The process includes initial screening, technical review, stakeholder feedback, and final decision.',
    category: 'workflow' as const,
    order: 1,
    status: 'published' as const,
    attachments: {
      links: [],
      files: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Quality Assurance Guidelines',
    description: 'Guidelines for maintaining quality standards in all processes',
    content: 'These guidelines establish the minimum quality standards for all processes within the organization. They cover documentation requirements, review criteria, and approval thresholds.',
    category: 'guidelines' as const,
    order: 2,
    status: 'published' as const,
    attachments: {
      links: [{
        title: "Quality Standards Reference",
        url: "https://example.com/quality-standards"
      }],
      files: [{
        title: "QA Checklist Template",
        url: "https://example.com/qa-checklist.pdf",
        type: "pdf" as const
      }]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Emergency Response Procedures',
    description: 'Step-by-step procedures for handling emergency situations',
    content: 'This document provides detailed procedures for responding to various emergency situations including system outages, security breaches, and critical process failures.',
    category: 'procedures' as const,
    order: 3,
    status: 'draft' as const,
    attachments: {
      links: [],
      files: []
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];