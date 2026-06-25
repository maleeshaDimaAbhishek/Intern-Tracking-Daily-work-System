import { apiFetch } from "./apiClient";

const parseJsonSafely=async (response) => {
    try {
        return await response.json();
    } catch {
        return {}
    }   
};

const getErrorMessage=(data, fallback)=>{
    if(typeof data === 'string') return data.detail;
    if(Array.isArray(data?.detail))
        {
            return data.detail.map((item)=>item.msg||"Invalid input").join(", ");
        }
    return fallback;
}

export const submitLeaveRequest=async (payload)=>{
    const response=await apiFetch("/leave/", {
        method: "POST",
        body: JSON.stringify(payload)
    });
    const data=await parseJsonSafely(response);
    if(!response.ok) throw new Error(getErrorMessage(data, "Failed to submit leave request"));
    return data;

}
export const getMyLeaveRequests=async ()=>{
    const response=await apiFetch("/leave/");
    if(!response.ok)throw new Error("Failed to fetch leave requests");
    return response.json();
}
export const getLeaveRequestById=async (id)=>{
    const response=await apiFetch(`/leave/${id}/`);
    if(!response.ok)throw new Error("Failed to fetch leave request");
    return response.json();
}
export const cancelLeaveRequest=async (id, comment="")=>{
    const response=await apiFetch(`/leave/${id}/cancel/`, {
        method: "PATCH",
        body: JSON.stringify({reason: comment})
    });
    const data=await parseJsonSafely(response);
    if(!response.ok) {
        console.error("Failed to cancel leave request:", data); // Log the error details
        throw new Error(getErrorMessage(data, "Failed to cancel leave request"));
    }
    return data;
}
export const getPendingApprovals=async ()=>{
    const response=await apiFetch("/leave/approval/pending");
    if (!response.ok) {
        // 1. Read the error JSON from FastAPI to see exactly what went wrong
        const errorData = await response.json(); 
        
        // 2. Log it to your browser console
        console.error("FastAPI 422 Error Details:", errorData); 
        
        // 3. Now throw your error to stop the execution
        throw new Error("Failed to fetch pending approvals"); 
    }
    return response.json();
}
// ── [Supervisor] Approve or reject a leave request ───────────────
export const decideLeaveRequest=async (id, decision, comment="")=>{
    const response=await apiFetch(`/leave/${id}/decide/`, {
        method: "POST",
        body: JSON.stringify({decision, comment})
    });
    const data=await parseJsonSafely(response);
    if(!response.ok) throw new Error(getErrorMessage(data, "Failed to decide leave request"));
    return data;
}
export const uploadMedicalCertificate=async (id, file)=>{
    const token=localStorage.getItem("token");
    const formData=new FormData();
    formData.append("file", file);
    const BASE_URL=import.meta.env.VITE_API_URL || "http://localhost:8000";
    const response=await fetch(`${BASE_URL}/leave/${id}/medical/`, {
        method: "POST",
        headers: {"Authorization": `Bearer ${token}`},
        body: formData
    });
    const data=await parseJsonSafely(response);
    if(!response.ok) throw new Error(getErrorMessage(data, "Failed to upload medical certificate"));
    return data;
}
export const getMedicalCertificateStatus=async (id)=>{
    const response=await apiFetch(`/leave/${id}/medical/`);
    if(!response.ok)throw new Error("Failed to fetch medical certificate status");
    return response.json();
}
export const getAuditLogsByLeave=async(leaveId)=>{
    const response=await apiFetch(`/audit/leave/${leaveId}/`);
    if(!response.ok)throw new Error("Failed to fetch audit logs");
    return response.json();
}
// ── Download the approval letter PDF ──────────────────────────────
// Triggers a real browser download — different from JSON endpoints,
// so we handle the blob response manually instead of response.json().
export const downloadApprovalLetter = async (leaveId, referenceNumber) => {
  const response = await apiFetch(`/leave/${leaveId}/approval-letter`);
 
  if (!response.ok) {
    const data = await parseJsonSafely(response);
    console.error("Failed to download approval letter:", data); // Log the error details
    throw new Error(getErrorMessage(data, "Failed to download approval letter"));
  }
 
  const blob = await response.blob();
  const url  = window.URL.createObjectURL(blob);
 
  const link = document.createElement("a");
  link.href = url;
  link.download = `Leave_Approval_${referenceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
