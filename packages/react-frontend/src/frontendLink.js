const deployedBackend = "https://crabrave-g0ave8bxcmgxasa0.westus3-01.azurewebsites.net";

const frontendLink = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : deployedBackend);

export default frontendLink;
