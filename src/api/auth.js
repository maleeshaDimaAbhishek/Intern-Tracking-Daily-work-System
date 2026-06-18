const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const loginUser = async (email, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error("Invalid email or password");
    return response.json();
}
export const sendOTP = async (email) => {
    const response = await fetch(`${BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.detail || "Failed to send OTP");
    }
    return response.json();
}
export const verifyOTP = async (email, otp) => {
    const response = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.detail || "Failed to verify OTP");
    }
    return response.json();
}
export const resetPassword = async (email, new_password) => {
    const response = await fetch(`${BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password })
    });
    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.detail || "Failed to reset password");
    }
    return response.json();
}
export const changePassword = async (new_password) => {
    const response = await fetch(`${BASE_URL}/auth/change-password`, {
        method: "POST",
        body: JSON.stringify({ new_password: new_password }),
    });
    if (!response.ok) {
        const err = await response.json()
        throw new Error(err?.detail || "Failed to change password");
    }
    return response.json();
}