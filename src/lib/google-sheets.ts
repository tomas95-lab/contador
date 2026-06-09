export const GOOGLE_SHEETS_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyNCJ1IXWAX0trVadVBfIWTSbFxvPhIp-S2AahWUjpnGIAj-zEAc32iS-BX-zTp3aKp/exec"

export async function postToGoogleSheet(payload: Record<string, unknown>) {
  await fetch(GOOGLE_SHEETS_ENDPOINT, {
    method: "POST",
    mode: "no-cors",
    keepalive: true,
    body: JSON.stringify(payload),
  })
}
