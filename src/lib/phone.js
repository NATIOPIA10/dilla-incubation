// Ethiopian mobile number in its 9-digit form: 0911.., 0711.., +251911.., 251711.. all become 9XXXXXXXX or 7XXXXXXXX
export function nationalMobile(input) {
  let d = String(input ?? '').replace(/\D/g, '')
  if (d.startsWith('00251')) d = d.slice(5)
  else if (d.startsWith('251')) d = d.slice(3)
  else if (d.startsWith('0')) d = d.slice(1)
  return /^[79]\d{8}$/.test(d) ? d : null
}