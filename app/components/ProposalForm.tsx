'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { validateInput, validateRequiredText, validateNumber } from '../utils/validation';

interface FormData {
  reviewerName: string;
  proposalTitle: string;
  projectCategory: string;
  teamSize: string;
  budgetEstimate: string;
  timelineWeeks: string;
  proposalSummary: string;
  technicalApproach: string;
  additionalNotes: string;
}

interface ProposalFormProps {
  onSubmitSuccess?: () => void;
}

export default function ProposalForm({ onSubmitSuccess }: ProposalFormProps) {
  const [formData, setFormData] = useState<FormData>({
    reviewerName: '',
    proposalTitle: '',
    projectCategory: '',
    teamSize: '',
    budgetEstimate: '',
    timelineWeeks: '',
    proposalSummary: '',
    technicalApproach: '',
    additionalNotes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Validate reviewer name
    const nameValidation = validateRequiredText(formData.reviewerName, 'Reviewer Name', 2, 100);
    if (!nameValidation.isValid) {
      errors.reviewerName = nameValidation.error!;
    }
    
    // Validate proposal title
    const titleValidation = validateRequiredText(formData.proposalTitle, 'Proposal Title', 5, 200);
    if (!titleValidation.isValid) {
      errors.proposalTitle = titleValidation.error!;
    }
    
    // Validate project category
    if (!formData.projectCategory) {
      errors.projectCategory = 'Project Category is required';
    }
    
    // Validate team size
    const teamSizeValidation = validateNumber(formData.teamSize, 'Team Size', 1, 100);
    if (!teamSizeValidation.isValid) {
      errors.teamSize = teamSizeValidation.error!;
    }
    
    // Validate budget estimate
    const budgetValidation = validateNumber(formData.budgetEstimate, 'Budget Estimate', 0);
    if (!budgetValidation.isValid) {
      errors.budgetEstimate = budgetValidation.error!;
    }
    
    // Validate timeline
    const timelineValidation = validateNumber(formData.timelineWeeks, 'Timeline (weeks)', 1, 104);
    if (!timelineValidation.isValid) {
      errors.timelineWeeks = timelineValidation.error!;
    }
    
    // Validate proposal summary
    const summaryValidation = validateRequiredText(formData.proposalSummary, 'Proposal Summary', 50, 2000);
    if (!summaryValidation.isValid) {
      errors.proposalSummary = summaryValidation.error!;
    }
    
    // Validate technical approach
    const approachValidation = validateRequiredText(formData.technicalApproach, 'Technical Approach', 50, 2000);
    if (!approachValidation.isValid) {
      errors.technicalApproach = approachValidation.error!;
    }
    
    // Validate additional notes (optional field)
    if (formData.additionalNotes) {
      const notesValidation = validateInput(formData.additionalNotes, 'Additional Notes');
      if (!notesValidation.isValid) {
        errors.additionalNotes = notesValidation.error!;
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    // Validate form before submission
    if (!validateForm()) {
      setIsSubmitting(false);
      setSubmitStatus({
        success: false,
        message: 'Please fix the validation errors below.'
      });
      return;
    }

    try {
      // Call the API endpoint to submit the form data to Google Sheets
      const response = await fetch('/api/submit-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit proposal');
      }
      
      // Success response
      setSubmitStatus({
        success: true,
        message: 'Your proposal has been successfully submitted!'
      });
      
      // Reset form after successful submission
      setFormData({
        reviewerName: '',
        proposalTitle: '',
        projectCategory: '',
        teamSize: '',
        budgetEstimate: '',
        timelineWeeks: '',
        proposalSummary: '',
        technicalApproach: '',
        additionalNotes: ''
      });
      setValidationErrors({});
      
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus({
        success: false,
        message: error instanceof Error ? error.message : 'There was an error submitting your proposal. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card-bg border border-border-color rounded-lg p-6 animate-fadeIn">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover-glow">
          <Image src="/icons/document-icon.svg" alt="Proposal" width={24} height={24} />
        </div>
        <h2 className="font-montserrat font-semibold text-2xl text-white">Proposal Submission Form</h2>
      </div>
      
      {submitStatus && (
        <div className={`mb-6 p-4 rounded-lg ${submitStatus.success ? 'bg-success bg-opacity-20' : 'bg-error bg-opacity-20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${submitStatus.success ? 'bg-success' : 'bg-error'}`}>
              {submitStatus.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p className="font-montserrat text-white">{submitStatus.message}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="form-group">
            <label htmlFor="reviewerName" className="form-label">Reviewer Name</label>
            <input
              type="text"
              id="reviewerName"
              name="reviewerName"
              value={formData.reviewerName}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="proposalTitle" className="form-label">Proposal Title</label>
            <input
              type="text"
              id="proposalTitle"
              name="proposalTitle"
              value={formData.proposalTitle}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="form-group">
            <label htmlFor="projectCategory" className="form-label">Project Category</label>
            <select
              id="projectCategory"
              name="projectCategory"
              value={formData.projectCategory}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select category</option>
              <option value="development">Development</option>
              <option value="research">Research</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="teamSize" className="form-label">Team Size</label>
            <select
              id="teamSize"
              name="teamSize"
              value={formData.teamSize}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select size</option>
              <option value="1">Solo (1 person)</option>
              <option value="2-5">Small (2-5 people)</option>
              <option value="6-10">Medium (6-10 people)</option>
              <option value="11+">Large (11+ people)</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="budgetEstimate" className="form-label">Budget Estimate (USD)</label>
            <input
              type="text"
              id="budgetEstimate"
              name="budgetEstimate"
              value={formData.budgetEstimate}
              onChange={handleChange}
              className="input"
              placeholder="e.g. 5000"
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="timelineWeeks" className="form-label">Timeline (weeks)</label>
          <input
            type="number"
            id="timelineWeeks"
            name="timelineWeeks"
            value={formData.timelineWeeks}
            onChange={handleChange}
            className="input"
            min="1"
            max="52"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="proposalSummary" className="form-label">Proposal Summary</label>
          <textarea
            id="proposalSummary"
            name="proposalSummary"
            value={formData.proposalSummary}
            onChange={handleChange}
            className="input min-h-[100px]"
            required
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="technicalApproach" className="form-label">Technical Approach</label>
          <textarea
            id="technicalApproach"
            name="technicalApproach"
            value={formData.technicalApproach}
            onChange={handleChange}
            className="input min-h-[100px]"
            required
          ></textarea>
        </div>
        
        <div className="form-group">
          <label htmlFor="additionalNotes" className="form-label">Additional Notes</label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleChange}
            className="input min-h-[100px]"
          ></textarea>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="btn btn-submit px-6 py-3 hover-lift"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Submitting...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>Submit Proposal</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}