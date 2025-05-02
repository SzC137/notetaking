const {query, validationResult} = require('express-validator');

const validatePaginateQueryParams = [
    //Validate and sanitize page query parameter
    //.optional is a method from the express-validator library. It tells the validator: "This field in not required, but if it exists, it must meet the following conditions....(which are all the dot sth sth chained after the .optional())"
    //.isInt: (in this context) if a page is present, it must be a positive integer
    //.toInt(): converted from a string (which all query values are by default) into an integer
    query('page')
        .optional()
        .isInt({min:1}).withMessage('Page must be a positive integer')
        .toInt(),

    //Validate and sanitize limit query parameter
    query('limit')
        .optional()
        .isInt({min:1}).withMessage('Limit must be a positive integer')
        .toInt(),
    
    //middleware to check for validation errors
    //
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            return res.status(400).json({errors:errors.array()});
        }

        if (!req.paginate){
            req.paginate = {};
        }

        req.paginate.page = parseInt(req.query.page, 10) || 1;
        req.paginate.limit = Math.min(parseInt(req.query.limit, 10) || 10, 10);

        next();
    }
];

module.exports = validatePaginateQueryParams;


//req, Short for request — contains everything about the incoming HTTP request, such as URL, body, headers, query params, etc.
//>>And I can add your own custom data, like req.paginate, req.user, etc. Think of req as a package sent by the client, containing all kinds of fields (address, message, content type, etc.)
//res, Short for response — used to send back data to the client (e.g., res.status(200).json(...))
//next, A function that passes the request to the next middleware or route handler. If I don't call next() at the end, the request will hang, and no further processing will happen
//req.paginate does not exist by default, the if (!req.paginate) line is saying: “If no one has created req.paginate yet, I’ll make it an empty object.”, and after that req.paginate just works as an object
//>>then the controller can access it with req.paginate.page, just like any other property
