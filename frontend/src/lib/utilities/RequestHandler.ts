const isDev = import.meta.env.VITE_MODE === "development";
const baseURL = isDev
	? import.meta.env.VITE_DEVELOPMENT_URL ?? "http://localhost:50000"
	: import.meta.env.VITE_PRODUCTION_URL ?? "";

export default class RequestHandler {

	static baseURL = baseURL;

	static async fetchData(
		method: string,
		link: string,
		requestData: Record<string, any> | FormData = {},
		headers: Record<string, string> = {},
		callback: ((error: string | null, data?: any) => void) | null = null
	) {
		const url = `${RequestHandler.baseURL}/api/sentiment/${link}`;
		const options: RequestInit = { method: method.toUpperCase() };

		const isClient = typeof window !== "undefined";
		const token = isClient ? localStorage.getItem("authToken") : null;
		if (token) headers["Authorization"] = `Bearer ${token}`;

		const isFormData = requestData instanceof FormData;

		if (!isFormData) {
			options.headers = { "Content-Type": "application/json", ...headers };
			if (!["get", "head"].includes(method.toLowerCase())) {
				options.body = JSON.stringify(requestData);
			}
		} else {
			options.headers = { ...headers };
			options.body = requestData;
		}
		try {
			const response = await fetch(url, options);
			const responseData = await response.json();
			if (!response.ok) {
				throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
			}
			if (callback) callback(null, responseData);
			return responseData;
		} catch (error: any) {
			console.error("Fetch error:", error);
			if (callback) callback(error.message || "Something went wrong.", undefined);
			return { success: false, message: error.message || "An error occurred", url };
		}
	}
}
