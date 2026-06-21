export const ok = (res, msg, data = {}) => {
  return res.json({
    ok: true,
    msg,
    data,
  });
};

export const fail = (res, msg, code = 400) => {
  return res.status(code).json({
    ok: false,
    msg,
  });
};
