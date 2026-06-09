import https from "node:https"

import soap, { type Client, type ISecurity } from "soap"

import { withArcaRequestTimeout } from "./timeout.js"

const clients = new Map<string, Promise<Client>>()
const arcaHttpsAgent = new https.Agent({
  ciphers: "DEFAULT@SECLEVEL=0",
})
const arcaSoapOptions = {
  httpsAgent: arcaHttpsAgent,
}
const arcaTransportSecurity: ISecurity = {
  addOptions(options) {
    Object.assign(options, arcaSoapOptions)
  },
  toXML() {
    return ""
  },
}

export async function getSoapClient(endpoint: string): Promise<Client> {
  const wsdlUrl = `${endpoint}?WSDL`
  const key = `${wsdlUrl}|${endpoint}`

  let clientPromise = clients.get(key)
  if (!clientPromise) {
    clientPromise = withArcaRequestTimeout(
      "SOAP client creation",
      soap.createClientAsync(wsdlUrl, {
        disableCache: false,
        endpoint,
        wsdl_options: arcaSoapOptions,
      })
    ).catch((error) => {
      clients.delete(key)
      throw error
    })
    clients.set(key, clientPromise)
  }

  const client = await clientPromise
  client.setEndpoint(endpoint)
  client.setSecurity(arcaTransportSecurity)
  return client
}
