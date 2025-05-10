// ImagenModal.jsx
import React from 'react';
import ReactDOM from 'react-dom';

const ImagenModal = ({ imagenSrc, onClose }) => {
    return ReactDOM.createPortal(
        // <div className="modal-backdrop show" style={{ position: 'fixed', zIndex: 2000, top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <div className="modal d-block" tabIndex="-1" style={{
                zIndex: 2001,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'auto'
            }}>
                <div className="modal-dialog modal-lg" style={{ margin: '10vh auto', zIndex: 2002 }}>
                    <div className="modal-content" style={{ backgroundColor: '#fff', opacity: 1,zIndex: 2003 }}>
                        <div className="modal-header">
                            <h5 className="modal-title">Vista previa de imagen</h5>
                            <button type="button" className="btn-close" onClick={onClose}></button>
                        </div>
                        <div className="modal-body text-center">
                            <img src={imagenSrc} alt="Detalle" className="img-fluid" />
                        </div>
                    </div>
                </div>
            </div>,
        // </div>,
        document.getElementById('modal-root')
    );
};

export default ImagenModal;
