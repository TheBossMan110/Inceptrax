from flask import Blueprint, request, jsonify
from app.services.email_service import EmailService
from app.utils.response_formatter import ResponseFormatter

contact_bp = Blueprint('contact_bp', __name__)

@contact_bp.route('/contact', methods=['POST'])
def submit_contact_form():
    data = request.get_json()
    
    name = data.get('name')
    email = data.get('email')
    subject = data.get('subject', 'New Contact Message')
    message = data.get('message')
    
    if not all([name, email, message]):
        return ResponseFormatter.error("Missing required fields")
        
    success, msg = EmailService.send_contact_email(name, email, subject, message, type='contact')
    
    if success:
        return ResponseFormatter.success(message="Message sent successfully")
    else:
        return ResponseFormatter.error(f"Failed to send message: {msg}")

@contact_bp.route('/support', methods=['POST'])
def submit_support_ticket():
    data = request.get_json()
    
    name = data.get('name')
    email = data.get('email')
    subject = data.get('subject')
    message = data.get('message')
    
    if not all([name, email, subject, message]):
        return ResponseFormatter.error("Missing required fields")
        
    success, msg = EmailService.send_contact_email(name, email, subject, message, type='support')
    
    if success:
        return ResponseFormatter.success(message="Support ticket created successfully")
    else:
        return ResponseFormatter.error(f"Failed to create ticket: {msg}")
