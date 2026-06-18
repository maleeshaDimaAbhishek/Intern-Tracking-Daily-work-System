const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

//central fetch function handle token expiration and refreshing
export const apiFetch = async(URL,options={})=>{
    const token=localStorage.getItem("token");
    const response = await fetch(`${BASE_URL}${URL}`,{
        ...options,
        headers:{
            "Content-Type":"application/json",
            "Authorization":`Bearer ${token}`,
            ...options.headers,
        },
    });
    if(response.status===401){
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.setItem("session_expired","true");
        window.location.href="/login";
    }
    return response;
};