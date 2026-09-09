// Controller genérico: recebe um Service e padroniza a resposta HTTP.
// Todo endpoint da API é: new GatewayController(new AlgumService(repository)).handle
export default class GatewayController {
  constructor(service) {
    this.service = service;
  }

  handle = async (req, res, next) => {
    try {
      const result = await this.service.execute(req);
      const status = result?.status ?? 200;

      return res.status(status).json({
        success: true,
        data: result?.data,
        ...(result?.meta ? { meta: result.meta } : {}),
      });
    } catch (error) {
      return next(error);
    }
  };
}
