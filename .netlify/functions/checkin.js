const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

exports.handler = async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ sucesso: false, mensagem: "Metodo nao permitido" })
    };
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const apiKey = process.env.API_KEY;

  if (!appsScriptUrl || !apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        sucesso: false,
        mensagem: "Variaveis de ambiente APPS_SCRIPT_URL/API_KEY nao configuradas"
      })
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const token = payload.token;

    if (!token) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ sucesso: false, mensagem: "Token ausente" })
      };
    }

    const upstreamResponse = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "checkin",
        token,
        apiKey
      })
    });

    const responseText = await upstreamResponse.text();
    let responseJson;

    try {
      responseJson = JSON.parse(responseText);
    } catch (_err) {
      return {
        statusCode: 502,
        headers: corsHeaders,
        body: JSON.stringify({ sucesso: false, mensagem: "Resposta invalida do upstream" })
      };
    }

    return {
      statusCode: upstreamResponse.ok ? 200 : upstreamResponse.status,
      headers: corsHeaders,
      body: JSON.stringify(responseJson)
    };
  } catch (_err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ sucesso: false, mensagem: "Erro interno no proxy" })
    };
  }
};
