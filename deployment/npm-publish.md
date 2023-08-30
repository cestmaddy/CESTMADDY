# Publish to the GitLab NPM registry

```bash
export NPM_TOKEN=<your token>
npm config -L project set @cestmaddy:registry https://git.chevro.fr/api/v4/projects/2/packages/npm/
npm config -L project set '//git.chevro.fr/api/v4/projects/2/packages/npm/:_authToken' "${NPM_TOKEN}"
npm publish
```
