exports.handler = async function(event) {
    return {
        statusCode: 200,
        body: JSON.stringify({ status: "VIVO_E_OPERANTE", data: new Date().toISOString() })
    };
};
