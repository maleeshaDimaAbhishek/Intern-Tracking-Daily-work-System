import "./Modal.css";

function Modal({ title, onClose, children, className = "" }) {
    return(
    //Clicking the dark backdrop closes the modal
    <div
        className={`modal-backdrop${className ? ` ${className}-backdrop` : ""}`}
        onClick={onClose}
        role="presentation"
    >
        {/* stopPropagation prevents clicks inside from closing it */}
        <div
            className={`modal-box${className ? ` ${className}` : ""}`}
            onClick={(e)=>e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={title}
        >
            <div className="modal-header">
                <h3>{title}</h3>
                <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
                    ✕
                </button>
            </div>
            <div className="modal-body">
                {children}
            </div>
        </div>
    </div>
    );
}
export default Modal;
