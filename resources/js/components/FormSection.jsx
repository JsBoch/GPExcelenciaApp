// resources/js/components/FormSection.jsx
import React from 'react';

const FormSection = ({ title, children, divider = true }) => {
  return (
    <div className="mb-4">
      {title && <h5 className="form-section-title">{title}</h5>}
      <hr className="form-divider" />
      <div>{children}</div>
      {divider && <hr className="form-divider" />}
    </div>
  );
};

export default FormSection;
