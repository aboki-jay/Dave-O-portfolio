/*
  sanity-studio/sanity.config.js
  ------------------------------
  The editor where David writes his case studies (Sanity Studio).
  The fields are in schemaTypes/case-study.js and follow the case study page from top to bottom.
*/
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes/index.js'

export default defineConfig({
  name: 'default',
  title: 'David Okunlola Portfolio',

  projectId: 'j5ifj8rh',
  dataset: 'production',

  plugins: [
    structureTool({
      // One simple list: the case studies, in the order they appear on the Work page.
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Case studies')
              .child(S.documentTypeList('caseStudy').title('Case studies').defaultOrdering([{field: 'order', direction: 'asc'}])),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
