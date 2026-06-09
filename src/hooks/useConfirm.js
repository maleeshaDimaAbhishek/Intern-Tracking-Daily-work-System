import { useState } from "react";
export function useConfirm() {
    const [dialog, setDialog] = useState(null);
    const confirm=({title,message,confirmText="Confirm",confirmType="danger"})=>{
        return new Promise((resolve)=>{
            setDialog({
                title,
                message,
                confirmText,
                confirmType,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }
    return { confirm, dialog };
}