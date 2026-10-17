/** Byggverdier lagt inn av vite.config.ts (buildVersion). I utvikling er bygget «dev». */
declare const __ML_BUILD__: string
declare const __ML_COMMIT__: string | null
declare const __ML_BRANCH__: string | null

export const BUILD: string = typeof __ML_BUILD__ === 'string' ? __ML_BUILD__ : 'dev'
export const COMMIT: string | null = typeof __ML_COMMIT__ === 'string' ? __ML_COMMIT__ : null
export const BRANCH: string | null = typeof __ML_BRANCH__ === 'string' ? __ML_BRANCH__ : null
