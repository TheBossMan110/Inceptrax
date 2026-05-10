from flask import jsonify

class ResponseFormatter:
    @staticmethod
    def success(data=None, message="Success", status=200):
        response = {
            "status": "success",
            "message": message,
            "data": data
        }
        return jsonify(response), status

    @staticmethod
    def error(message="Error", status=400, errors=None):
        response = {
            "status": "error",
            "message": message
        }
        if errors:
            response["errors"] = errors
        return jsonify(response), status
