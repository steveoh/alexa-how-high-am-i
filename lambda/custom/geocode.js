const toQueryString = require('./toQueryString');
const fetch = require('node-fetch');

const find = async (street, zone, apiKey) => {
  console.log(`geocoding ${street}, ${zone}, ${apiKey}`);

  const response = await geocode({
    street: street,
    zone: zone,
    apiKey: apiKey
  });

  const location = await extractResponse(response);

  return location;
};

const geocode = (options) => {
  const url = `http://api.mapserv.utah.gov/api/v1/Geocode/${options.street}/${options.zone}?`;

  const query = {
    apiKey: options.apiKey,
    spatialReference: 26912
  };

  const querystring = toQueryString(query);

  return fetch(url + querystring, {
    method: 'GET',
    headers: {
      'referer': 'http://alexa.how-high-am-i.com'
    }
  });
};

const extractResponse = async (response) => {
  if (!response.ok) {
    console.warn(response);

    return null;
  }

  let result = await response.json();

  if (result.status !== 200) {
    console.warn(response);

    return null;
  }

  result = result.result;

  return {
    x: result.location.x,
    y: result.location.y
  };
};

module.exports = find;
