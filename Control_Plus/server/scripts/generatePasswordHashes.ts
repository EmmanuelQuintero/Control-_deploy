import bcrypt from "bcrypt";

const passwords = [
  "Clave123",
  "Clave456",
  "Clave789",
  "Clave101112",
  "admin123"
];

async function generateHashes() {
  console.log("Generando hashes bcrypt...\n");
  
  for (const password of passwords) {
    const hash = await bcrypt.hash(password, 10);
    console.log(`Contraseña: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log("─".repeat(80));
  }
}

generateHashes().catch(console.error);
