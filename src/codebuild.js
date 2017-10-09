
export const dispatch = async (event, context, callback) => {

  console.log("EVENT: %s", JSON.stringify(event));
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'pull_request.js executed successfully!',
      input: event,
    }),
  };
  callback(null, response);
}
