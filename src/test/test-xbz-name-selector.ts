import assert from 'node:assert/strict'
import * as cheerio from 'cheerio'
import { extractXbzProductName } from '../sites/xbz/adapter.js'

const $ = cheerio.load(`
  <div id="detalhe_produto_">
    <div id="swiper-comprejunto">
      <span class="produto-nome">Estojo Fibra de Bambu</span>
    </div>
    <div id="swiper-comprejuntomobile">
      <span class="produto-nome">Estojo Fibra de Bambu</span>
    </div>
    <form><p class="produto-nome">Caneta Fibra de Bambu Touch com Suporte</p></form>
  </div>
`)

assert.equal(extractXbzProductName($), 'Caneta Fibra de Bambu Touch com Suporte')
assert.equal(extractXbzProductName(cheerio.load('<div id="detalhe_produto_"><h1>00708T</h1></div>')), null)
console.log('OK: o nome principal vence o nome do bloco Compre Junto')
