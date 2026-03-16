/**
 * ═══════════════════════════════════════════════════════════════
 * NFC TAG SEED DATA
 * ═══════════════════════════════════════════════════════════════
 * 
 * Maps NFC tag UIDs to students (by email).
 * Used by the nfc seed command to link physical NFC cards to
 * student accounts in the database.
 * 
 * Add new entries below as you program more NFC tags.
 * ═══════════════════════════════════════════════════════════════
 */

export const NFC_TAGS = [
    {
        studentEmail: "aarav.mehta.1a@nv.com",
        nfcUid: "53:DF:CC:FA:31:00:01",
        label: "Aarav Mehta (NV 1-A)"
    },
    // Add more tags here:
    // { studentEmail: "ananya@dps.com", nfcUid: "XX:XX:XX:XX:XX:XX:XX", label: "Ananya Verma (DPS 10th-A)" },
];
