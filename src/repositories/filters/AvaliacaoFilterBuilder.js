class AvaliacaoFilterBuilder {
  constructor() {
    this.filtros= {};
  }
  comAvaliador(avaliador_id) {
    if (avaliador_id) this.filtros.avaliador_id = avaliador_id;
    return this;
  }

  comAvaliado(avaliado_id) {
    if (avaliado_id) this.filtros.avaliado_id = avaliado_id;
    return this;
  }
  comItem(item_id) {
    if (item_id) this.filtros.item_id = item_id;
    return this;
  }
  comTipo(tipo) {
    if (tipo) this.filtros.tipo = tipo;
    return this;
  }

  build() {
    return this.filtros;
  }
}

export default AvaliacaoFilterBuilder;