const { db } = require("../config/firebase");

const equipment = [
  { id: "seed-01", name: "Microscope", category: "Biology", description: "Olympus CX23 compound microscope with 4×, 10×, 40× and 100× objectives.", imageUrl: "/equipment/microscope.png", location: "Biology Lab · Lab B", quantity: 1, status: "available" },
  { id: "seed-02", name: "Oscilloscope", category: "Electronics", description: "Digital oscilloscope for signal analysis, circuit diagnostics, and waveform measurement.", imageUrl: "/equipment/oscilloscope.png", location: "Electronics Lab · Lab A", quantity: 1, status: "available" },
  { id: "seed-03", name: "Centrifuge", category: "Biotechnology", description: "Refrigerated benchtop centrifuge with programmable speed and temperature control.", imageUrl: "/equipment/centrifuge.png", location: "Biotechnology Lab · Lab C", quantity: 1, status: "limited" },
  { id: "seed-04", name: "Spectrophotometer", category: "Chemistry", description: "UV-visible spectrophotometer for precise absorbance and concentration measurements.", imageUrl: "/equipment/spectrophotometer.png", location: "Chemistry Lab · Lab D", quantity: 1, status: "available" },
  { id: "seed-05", name: "Digital Multimeter", category: "Electronics", description: "True RMS digital multimeter with voltage, current, resistance, and continuity modes.", imageUrl: "/equipment/multimeter.png", location: "Electronics Lab · Lab A", quantity: 1, status: "available" },
  { id: "seed-06", name: "3D Printer", category: "Rapid Prototyping", description: "FDM printer with a 220 × 220 mm build volume for rapid prototyping projects.", imageUrl: "/equipment/3d-printer.png", location: "Innovation Lab · Lab E", quantity: 1, status: "maintenance" }
];

async function seedEquipment() {
  let created = 0;
  for (const item of equipment) {
    const ref = db.collection("equipment").doc(item.id);
    const existing = await ref.get();
    if (existing.exists) {
      console.log("Keeping existing equipment:", item.name);
      continue;
    }
    const { id, ...data } = item;
    await ref.set({ ...data, createdAt: new Date(), updatedAt: new Date(), createdBy: "system-seed" });
    created++;
    console.log("Added:", item.name);
  }
  console.log(`Equipment seed complete. Added ${created} item(s).`);
}

seedEquipment().catch((error) => {
  console.error("Equipment seed failed:", error);
  process.exitCode = 1;
});
