/*
  sanity-studio/sanity.config.js
  ------------------------------
  The editor where David writes his case studies and adds his explorations (Sanity Studio).
  The fields are in schemaTypes/case-study.js (they follow the case study page from top to bottom)
  and schemaTypes/exploration.js.
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
      // Two simple lists. First the case studies, in the order they appear on the Work page.
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Case studies')
              .child(S.documentTypeList('caseStudy').title('Case studies').defaultOrdering([{field: 'order', direction: 'asc'}])),
            // The tiles on the Exploration page's board, in the order they are laid out.
            S.listItem()
              .title('Explorations')
              .child(S.documentTypeList('exploration').title('Explorations').defaultOrdering([{field: 'order', direction: 'asc'}])),
          ]),
    }),
  ],

  schema: {
    types: schemaTypes,
  },
})
