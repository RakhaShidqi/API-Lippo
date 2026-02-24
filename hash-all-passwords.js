// hash-all-passwords.js
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function hashAllPasswords() {
  try {
    console.log("🔍 Mencari user dengan password plain text...");
    
    // Ambil semua user
    const [users] = await db.query("SELECT id, email, password FROM users");
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Cek apakah password sudah hash (panjang 60 dan mulai dengan $2a$)
      const isHashed = user.password && 
                       user.password.length === 60 && 
                       user.password.startsWith('$2a$');
      
      if (!isHashed && user.password) {
        console.log(`\n📝 User: ${user.email}`);
        console.log(`   Password plain: ${user.password.substring(0, 20)}...`);
        
        // Hash password
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Update database
        await db.query(
          "UPDATE users SET password = ? WHERE id = ?",
          [hashedPassword, user.id]
        );
        
        console.log(`   ✅ Updated to hash: ${hashedPassword.substring(0, 30)}...`);
        updated++;
      } else {
        console.log(`\n📝 User: ${user.email} - ✅ Already hashed`);
        skipped++;
      }
    }
    
    console.log(`\n✅ Selesai! ${updated} user diupdate, ${skipped} user sudah hash`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit();
  }
}

hashAllPasswords();