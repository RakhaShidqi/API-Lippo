// update-password.js
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function updatePassword() {
  try {
    const email = 'tes@tes.com';
    const plainPassword = 'admin123';
    
    // Hash password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('📝 Email:', email);
    console.log('📝 Plain password:', plainPassword);
    console.log('📝 Hashed password:', hashedPassword);
    console.log('📝 Hash length:', hashedPassword.length);
    
    // Update database
    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashedPassword, email]
    );
    
    if (result.affectedRows > 0) {
      console.log('✅ Password updated successfully!');
      
      // Verifikasi
      const [users] = await db.query(
        "SELECT id, email, password FROM users WHERE email = ?",
        [email]
      );
      
      if (users.length > 0) {
        const verify = await bcrypt.compare(plainPassword, users[0].password);
        console.log('🔐 Verification:', verify ? '✅ Success' : '❌ Failed');
      }
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

updatePassword();