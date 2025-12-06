import logger from "./logger.js";

const handleNotFound = (res, modelName, id) => {
  const message = `Did not find ${modelName} for id ${id}`;
  console.log(message);
  logger.warn(message);

  return res.status(404).json({
    success: false,
    msg: message,
  });
};

const handleAlreadyExists = (res, modelName, name) => {
  const message = `Already existing ${modelName} for name ${name}`;
  console.log(message);
  logger.warn(message);

  return res.status(409).json({
    success: false,
    msg: message,
  });
};

const handleErrorResponse = (res, error, msg = "Internal Server Error") => {
  const fullError = `Error: ${msg} - ${error.message}`;
  console.log(fullError);
  logger.error(fullError);

  return res.status(500).json({
    success: false,
    msg,
    error: error.message,
  });
};

const handleSuccessResponse = (res, data, msg = "Success") => {
  const message = `Success: ${msg}`;
  console.log(message);
  logger.info(message);

  return res.status(200).json({
    success: true,
    msg,
    data,
  });
};

export function parsePagination(query) {
  const page = Math.max(parseInt(query.page ?? "1", 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(query.pageSize ?? "10", 10), 1),
    100
  );
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip };
}

export {
  handleAlreadyExists,
  handleErrorResponse,
  handleNotFound,
  handleSuccessResponse,
};
