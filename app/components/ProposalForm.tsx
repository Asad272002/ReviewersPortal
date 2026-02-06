'use client';

import { useState, FormEvent } from 'react';
import { validateInput, validateRequiredText, validateNumber, sanitizeInput } from '../utils/validation';
import { FileText, CheckCircle, AlertCircle, Loader2, Send } from 'lucide-react';

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
    const nameValidation = validateRequiredText(formData.reviewerName, 'Reviewer Name', 1, 100);
    if (!nameValidation.isValid) {
      errors.reviewerName = nameValidation.error!;
    }
    
    // Validate proposal title
    const titleValidation = validateRequiredText(formData.proposalTitle, 'Proposal Title', 1, 200);
    if (!titleValidation.isValid) {
      errors.proposalTitle = titleValidation.error!;
    }
    
    // Validate project category
    if (!formData.projectCategory) {
      errors.projectCategory = 'Project Category is required';
    } else {
      const allowedCategories = new Set(['development','research','infrastructure','community','other']);
      if (!allowedCategories.has(formData.projectCategory)) {
        errors.projectCategory = 'Please select a valid project category';
      }
    }
    
    // Validate team size (selection categories)
    if (!formData.teamSize) {
      errors.teamSize = 'Team Size is required';
    } else {
      const allowedTeamSizes = new Set(['1','2-5','6-10','11+']);
      if (!allowedTeamSizes.has(formData.teamSize)) {
        errors.teamSize = 'Please select a valid team size';
      }
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
    const summaryValidation = validateRequiredText(formData.proposalSummary, 'Proposal Summary', 1, 2000);
    if (!summaryValidation.isValid) {
      errors.proposalSummary = summaryValidation.error!;
    }
    
    // Validate technical approach
    const approachValidation = validateRequiredText(formData.technicalApproach, 'Technical Approach', 1, 2000);
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
      // Build sanitized payload
      const payload = {
        reviewerName: sanitizeInput(formData.reviewerName).trim(),
        proposalTitle: sanitizeInput(formData.proposalTitle).trim(),
        projectCategory: formData.projectCategory,
        teamSize: formData.teamSize,
        budgetEstimate: formData.budgetEstimate.trim(),
        timelineWeeks: formData.timelineWeeks.trim(),
        proposalSummary: sanitizeInput(formData.proposalSummary).trim(),
        technicalApproach: sanitizeInput(formData.technicalApproach).trim(),
        additionalNotes: sanitizeInput(formData.additionalNotes || '').trim(),
      };

      // Call the API endpoint to submit the form data to Google Sheets
      const response = await fetch('/api/submit-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-purple-500/20">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <h2 className="font-montserrat font-semibold text-2xl text-white">Proposal Submission Form</h2>
      </div>
      
      {submitStatus && (
        <div className={`mb-6 p-4 rounded-lg border ${submitStatus.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${submitStatus.success ? 'bg-green-500' : 'bg-red-500'}`}>
              {submitStatus.success ? (
                <CheckCircle className="w-4 h-4 text-white" />
              ) : (
                <AlertCircle className="w-4 h-4 text-white" />
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
              className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
              required
            />
            {validationErrors.reviewerName && <p className="form-error">{validationErrors.reviewerName}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="proposalTitle" className="form-label">Proposal Title</label>
            <input
              type="text"
              id="proposalTitle"
              name="proposalTitle"
              value={formData.proposalTitle}
              onChange={handleChange}
              className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
              required
            />
            {validationErrors.proposalTitle && <p className="form-error">{validationErrors.proposalTitle}</p>}
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
              className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
              required
            >
              <option value="">Select category</option>
              <option value="development">Development</option>
              <option value="research">Research</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="community">Community</option>
              <option value="other">Other</option>
            </select>
            {validationErrors.projectCategory && <p className="form-error">{validationErrors.projectCategory}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="teamSize" className="form-label">Team Size</label>
            <select
              id="teamSize"
              name="teamSize"
              value={formData.teamSize}
              onChange={handleChange}
              className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
              required
            >
              <option value="">Select size</option>
              <option value="1">Solo (1 person)</option>
              <option value="2-5">Small (2-5 people)</option>
              <option value="6-10">Medium (6-10 people)</option>
              <option value="11+">Large (11+ people)</option>
            </select>
            {validationErrors.teamSize && <p className="form-error">{validationErrors.teamSize}</p>}
          </div>
          
          <div className="form-group">
            <label htmlFor="budgetEstimate" className="form-label">Budget Estimate (USD)</label>
            <input
              type="text"
              id="budgetEstimate"
              name="budgetEstimate"
              value={formData.budgetEstimate}
              onChange={handleChange}
              className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
              placeholder="e.g. 5000"
              required
            />
            {validationErrors.budgetEstimate && <p className="form-error">{validationErrors.budgetEstimate}</p>}
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
            className="input bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
            min="1"
            max="52"
            required
          />
          {validationErrors.timelineWeeks && <p className="form-error">{validationErrors.timelineWeeks}</p>}
        </div>
        
        <div className="form-group">
          <label htmlFor="proposalSummary" className="form-label">Proposal Summary</label>
          <textarea
            id="proposalSummary"
            name="proposalSummary"
            value={formData.proposalSummary}
            onChange={handleChange}
            className="input min-h-[100px] bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
            required
          ></textarea>
          {validationErrors.proposalSummary && <p className="form-error">{validationErrors.proposalSummary}</p>}
        </div>
        
        <div className="form-group">
          <label htmlFor="technicalApproach" className="form-label">Technical Approach</label>
          <textarea
            id="technicalApproach"
            name="technicalApproach"
            value={formData.technicalApproach}
            onChange={handleChange}
            className="input min-h-[100px] bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
            required
          ></textarea>
          {validationErrors.technicalApproach && <p className="form-error">{validationErrors.technicalApproach}</p>}
        </div>
        
        <div className="form-group">
          <label htmlFor="additionalNotes" className="form-label">Additional Notes</label>
          <textarea
            id="additionalNotes"
            name="additionalNotes"
            value={formData.additionalNotes}
            onChange={handleChange}
            className="input min-h-[100px] bg-[#1A0A3A]/50 border-white/10 focus:border-[#9050E9] focus:ring-1 focus:ring-[#9050E9]"
          ></textarea>
        </div>
        
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="btn btn-submit px-6 py-3 hover-lift flex items-center gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <span>Submit Proposal</span>
                <Send className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </form>

    </div>
  );
}