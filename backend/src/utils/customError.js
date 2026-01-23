export class CustomError extends Error {
    constructor(message, statusCode, code, data) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.data = data;
    }
}
