export async function getAppAccessToken(
  tenantId: string,
  appId: string,
  password: string
): Promise<string> {
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append("client_id", appId);
  params.append("client_secret", password);
  params.append("scope", "https://graph.microsoft.com/.default");
  params.append("grant_type", "client_credentials");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const responseData = await response.json();
  if (typeof responseData.access_token !== "string") {
    throw new Error("Invalid response from token endpoint");
  }
  return responseData.access_token;
}
