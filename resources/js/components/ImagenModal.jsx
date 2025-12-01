// ImagenModal.js
import React from "react";
import "../../css/imagen-modal-premium.css";

const ImagenModal = ({ imagenSrc, onClose }) => {
    if (!imagenSrc) return null;

    return (
        <div className="imgmodal-overlay" onClick={onClose}>
            <div
                className="imgmodal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button className="imgmodal-close-btn" onClick={onClose}>
                    ✕
                </button>

                <img src={imagenSrc} alt="Imagen" className="imgmodal-image" />
            </div>
        </div>
    );
};

export default ImagenModal;
