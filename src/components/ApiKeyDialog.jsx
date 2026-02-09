import { useState } from 'react';
import PropTypes from 'prop-types';
import '../styles/ApiKeyDialog.css';

const API_KEY_LINKS = {
  gemini: {
    url: 'https://aistudio.google.com/api-keys',
    name: 'Google AI Studio'
  },
  mistral: {
    url: 'https://console.mistral.ai/home?workspace_dialog=apiKeys',
    name: 'Mistral Console'
  },
  openrouter: {
    url: 'https://openrouter.ai/',
    name: 'OpenRouter'
  }
};

const ApiKeyDialog = ({ service, onSave, onCancel }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const linkInfo = API_KEY_LINKS[service];
  const serviceName = service.charAt(0).toUpperCase() + service.slice(1);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await onSave(apiKey.trim());
    } catch (err) {
      setError('Failed to save API key. Please try again.');
      console.error('Error saving API key:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="api-key-dialog-overlay">
      <div className="api-key-dialog">
        <div className="dialog-header">
          <h2>{serviceName} API Key Required</h2>
          <button 
            className="close-button" 
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        
        <div className="dialog-content">
          <p className="dialog-description">
            To use the {serviceName} AI model, you need to provide your API key. 
            Your API key will be encrypted and stored securely in your browser.
          </p>

          {linkInfo && (
            <div className="api-key-link">
              <p>Don&apos;t have an API key?</p>
              <a 
                href={linkInfo.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="create-key-link"
              >
                Create one at {linkInfo.name} →
              </a>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="api-key-input">API Key</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Enter your ${serviceName} API key`}
              autoFocus
              disabled={isLoading}
              className={error ? 'error' : ''}
            />
            {error && <span className="error-message">{error}</span>}
          </div>
        </div>

        <div className="dialog-actions">
          <button 
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="save-button"
            disabled={isLoading || !apiKey.trim()}
          >
            {isLoading ? 'Saving...' : 'Save API Key'}
          </button>
        </div>
      </div>
    </div>
  );
};

ApiKeyDialog.propTypes = {
  service: PropTypes.oneOf(['gemini', 'mistral', 'openrouter']).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ApiKeyDialog;
