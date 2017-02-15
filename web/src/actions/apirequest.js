export default async ({ url, token, body }) => {
  const headers = {};

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer: ${token}`;
  }

  let response;
  try {
    response = await fetch(
      `${process.env.PUBLIC_URL}${url}`,
      {
        method: 'POST',
        body: body && JSON.stringify(body),
        headers
      });
  } catch (e) {
    throw Object.assign(
      new Error('failed to fetch'),
      { code: 'NetworkError' });
  }

  if (response.status !== 200) {
    throw Object.assign(
      new Error(`POST returned ${response.status}`),
      {
        code: 'ResponseError',
        status: response.status
      });
  }

  const json = await response.json();
  if (json.error) {
    const error = new Error(json.error.message);
    if (json.error.code) {
      throw Object.assign(error, { code: json.error.code });
    }
    throw error;
  }
  return json.response;
};
