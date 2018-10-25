const toQueryString = require('./toQueryString');
const fetch = require('node-fetch');

const find = async (table, attribute, geometry, apiKey) => {
  console.log(`searching ${table}, ${attribute}, ${geometry}, ${apiKey}`);

  const response = await search({
    attribute: attribute,
    table: table,
    point: geometry,
    apiKey: apiKey
  });

  const elevation = await extractResponse(response);

  return elevation;
};

const search = (options) => {
  const url = `http://api.mapserv.utah.gov/api/v1/search/${options.table}/${options.attribute}?`;

  const query = {
    apiKey: options.apiKey,
    geometry: options.point,
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

  console.log(result);

  if (result.status !== 200) {
    console.warn(response);

    return null;
  }

  result = result.result[0];

  const elevation = parseFloat(result.attributes.feet).toFixed(0);

  return elevation;
};

module.exports = find;
