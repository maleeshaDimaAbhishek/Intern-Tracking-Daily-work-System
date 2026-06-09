import "./Modal.css";

function Modal({title,onClose,children}) {
    return(
    //Clicking the dark backdrop closes the modal
    <div className="modal-backdrop" onClick={onClose}>
        {/* stopPropagation prevents clicks inside from closing it */}
        <div className="modal-box" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-header">
                <h3>{title}</h3>
                <button className="modal-close" onClick={onClose}>
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