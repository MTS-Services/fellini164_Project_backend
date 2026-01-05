/**
 * Mailgun Email Service Test Script
 * 
 * This script tests the Mailgun SMTP configuration by sending a test email.
 * 
 * Usage: node test-mailgun.js
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testMailgunConnection() {
  console.log('Testing Mailgun SMTP Configuration...\n');
  
  // Display configuration (hide password)
  console.log('Configuration:');
  console.log('- Host:', process.env.EMAIL_HOST);
  console.log('- Port:', process.env.EMAIL_PORT);
  console.log('- User:', process.env.EMAIL_USER);
  console.log('- From:', `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`);
  console.log('- Password:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
  console.log('');
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  try {
    // Test 1: Verify connection
    console.log('Test 1: Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');
    
    // Test 2: Send a test email
    console.log('Test 2: Sending test email...');
    const testEmail = process.env.EMAIL_USER; // Send to yourself
    
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Elyxa AI'} <${process.env.FROM_EMAIL || process.env.EMAIL_USER}>`,
      to: testEmail,
      subject: 'Mailgun Test Email - Elyxa AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #4CAF50;">✅ Mailgun Configuration Successful!</h1>
          <p>This is a test email from your Elyxa AI backend application.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Host: ${process.env.EMAIL_HOST}</li>
            <li>Port: ${process.env.EMAIL_PORT}</li>
            <li>From Email: ${process.env.FROM_EMAIL}</li>
            <li>From Name: ${process.env.FROM_NAME}</li>
          </ul>
          <p>If you received this email, your Mailgun SMTP integration is working correctly!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Sent from Elyxa AI Backend<br>
            Test Date: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: 'Mailgun Test Email - If you received this, your configuration is working!'
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);
    console.log(`Check your inbox at: ${testEmail}\n`);
    
    console.log('🎉 All tests passed! Mailgun is configured correctly.');
    
  } catch (error) {
    console.error('❌ Error during test:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  Authentication failed. Please check:');
      console.error('   1. Email username is correct: support@elyxaai.com');
      console.error('   2. Password is correct (not the Mailgun API key, but SMTP password)');
      console.error('   3. SMTP credentials are properly set in Mailgun dashboard');
    } else if (error.code === 'ECONNECTION') {
      console.error('\n⚠️  Connection failed. Please check:');
      console.error('   1. SMTP host is correct: smtp.mailgun.org');
      console.error('   2. Port is correct: 587');
      console.error('   3. Your internet connection');
    }
    
    process.exit(1);
  }
}

// Run the test
testMailgunConnection();
