import { Router } from 'express';

import { staticFront, staticContent, static404, redirExtIndexes, intercept } from './controllers';
import { addProxies } from './proxies';

const router = Router({ strict: true });

// Remove `x-powered-by` header
router.use((_req, res, next) => {
	res.removeHeader('X-Powered-By');
	next();
});

addProxies(router);
router.use('/front', staticFront);
router.use(redirExtIndexes);
router.use(intercept);
router.use(staticContent);
router.use(static404);

export default router;
