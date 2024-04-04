class ErrorResponse {
  success: boolean;
  message: string;
  error?: any;

  constructor(message: string = "Something wrong occurred", error?: any) {
    this.success = false;
    this.message = message;
    this.error = error || ""; // If error is undefined or null, assign an empty string
  }
}

export default ErrorResponse;
