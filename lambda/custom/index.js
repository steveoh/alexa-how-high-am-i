/* eslint no-use-before-define: 0 */
const Alexa = require('ask-sdk-core');
const geocode = require('./geocode');
const search = require('./elevation');

// core functionality for fact skill
const GetHeightHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type

    return request.type === 'LaunchRequest'
      || (request.type === 'IntentRequest'
      && request.intent.name === 'GetElevationIntent');
  },
  async checkPermission(requestEnvelope, serviceClientFactory, responseBuilder) {
    const consentToken = requestEnvelope.context.System.user.permissions
      && requestEnvelope.context.System.user.permissions.consentToken;

    if (!consentToken) {
      return responseBuilder
        .speak('Please enable Location permissions in the Amazon Alexa app.')
        .withAskForPermissionsConsentCard(['read::alexa:device:all:address'])
        .getResponse();
    }

    const { deviceId } = requestEnvelope.context.System.device;
    const deviceAddressServiceClient = serviceClientFactory.getDeviceAddressServiceClient();
    const address = await deviceAddressServiceClient.getFullAddress(deviceId);

    if (address.addressLine1 === null && (address.city === null || address.postalCode === null)) {
      return responseBuilder
      .speak(`It looks like you don't have an address set. You can set your address from the companion app.`)
      .getResponse();
    }

    console.log(address);

    return {
      street: address.addressLine1,
      zone: address.city || address.postalCode
    };
  },
  async handle(handlerInput) {
    // const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const { requestEnvelope, serviceClientFactory, responseBuilder } = handlerInput;
    const address = await this.checkPermission(requestEnvelope, serviceClientFactory, responseBuilder);

    if (address.outputSpeech) {
      return address;
    }

    console.log('Address successfully retrieved, now responding to user.');
    const apiKey = 'AGRC-D97E34C0127262';
    const location = await geocode(address.street, address.zone, apiKey);

    if (!location) {
      return handlerInput.responseBuilder
        .speak('I could not find your address')
        .withSimpleCard('Utah Elevation', 'I could not find your address')
        .getResponse();
    }

    const elevation = await search('SGID10.RASTER.USGS_DEM_10METER', 'feet', `point: [${location.x}, ${location.y}]`, apiKey);

    return handlerInput.responseBuilder
      .speak(`You are ${elevation} feet high!`)
      .withSimpleCard('Utah Elevation', `${elevation} feet`)
      .getResponse();
  }
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('You can say how hight am i, or, you can say exit... What can I help you with?')
      .reprompt('What can I help you with?')
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('I can\'t help you wiht that. I can tell you how high you are. What can I help you with?')
      .reprompt('What can I help you with?')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Goodbye!')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);

    return handlerInput.responseBuilder
      .speak('Sorry, an error occurred.')
      .reprompt('Sorry, an error occurred.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    GetHeightHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .withApiClient(new Alexa.DefaultApiClient())
  .lambda();
