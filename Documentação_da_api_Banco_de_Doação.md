# Documentação da API - Banco de Doação - Doai

Nosso sistema tem como objetivo possibilitar a comunicação entre doadores e interessados em itens domésticos ou outros objetos. A proposta é solucionar a dificuldade no escoamento e na busca por itens doados em comunidades locais.

## 1. Usuários

### 1.1 POST /usuarios
**Caso de Uso:**
Permitir o cadastro de novos usuários na plataforma de doação.

**História de Usuário:**
Como visitante, quero criar uma conta na plataforma, para anunciar itens, demonstrar interesse em doações e participar do sistema.

**Regras de Negócio:**
* O cadastro exige: nome completo, e-mail, CPF, cidade e senha.
* O CPF deve ser válido (com verificação de dígitos) e único no sistema. O e-mail também deve ser único.
* A senha deve atender a critérios mínimos de segurança: mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula e um número.
* A senha deve ser armazenada em formato hash (bcrypt, mínimo 10 salt rounds). Nunca armazenar em texto puro.
* Ao criar a conta com sucesso, o usuário recebe o perfil `USUARIO` e a situação `ATIVO`.
* Se o CPF ou e-mail já existir no banco, o sistema deve notificar o usuário e sugerir login ou recuperação de senha.
* Todos os campos obrigatórios devem ser validados — campos em branco geram alerta.

### 1.2 GET /usuarios
**Caso de Uso:**
Permitir a listagem de usuários cadastrados na plataforma.

**História de Usuário:**
Como administrador ou sistema autorizado, quero listar os usuários cadastrados, para consultar informações gerais da base sem expor dados sensíveis.

**Regras de Negócio:**
* A rota deve retornar a lista de usuários cadastrados.
* Informações sensíveis não devem ser retornadas.
* A listagem pode ser paginada para evitar excesso de dados.

### 1.3 GET /usuarios/:id
**Caso de Uso:**
Permitir a consulta de um usuário específico.

**História de Usuário:**
Como usuário autenticado ou administrador, quero consultar um usuário específico, para visualizar seus dados públicos e contexto dentro da plataforma.

**Regras de Negócio:**
* O sistema deve buscar o usuário pelo ID informado.
* Caso o usuário não exista, deve retornar um erro apropriado.
* Informações sensíveis como senhas Hash não devem ser retornadas.

### 1.4 PUT /usuarios/:id
**Caso de Uso:**
Permitir a atualização completa dos dados de um usuário.

**História de Usuário:**
Como usuário autenticado, quero atualizar completamente meu cadastro, para manter minhas informações corretas e atualizadas.

**Regras de Negócio:**
* O usuário só pode editar seus próprios dados.
* Campos obrigatórios devem ser validados.
* Se o e-mail ou CPF forem alterados, deve ser verificada a unicidade no sistema.
* Caso a senha seja alterada, ela deve ser novamente criptografada.

### 1.5 PATCH /usuarios/:id
**Caso de Uso:**
Permitir atualização parcial dos dados do usuário.

**História de Usuário:**
Como usuário autenticado, quero alterar apenas parte dos meus dados, para corrigir informações sem reenviar todo o cadastro.

**Regras de Negócio:**
* Apenas os campos enviados devem ser atualizados.
* Os campos devem passar por validação.

### 1.6 DELETE /usuarios/:id
**Caso de Uso:**
Permitir a remoção de um usuário da plataforma.

**História de Usuário:**
Como usuário autenticado, quero remover ou desativar minha conta, para encerrar meu uso da plataforma quando desejar.

**Regras de Negócio:**
* O usuário deve estar autenticado.
* A remoção pode ser lógica (inativação) ou física.

### 1.7 GET /usuarios/:id/itens
**Caso de Uso:**
Permitir visualizar os itens cadastrados por um usuário.

**História de Usuário:**
Como usuário da plataforma, quero visualizar os itens publicados por outro usuário, para conhecer suas doações disponíveis ou seu histórico de anúncios.

**Regras de Negócio:**
* O sistema deve retornar todos os itens cadastrados pelo usuário.

### 1.8 GET /usuarios/:id/avaliacoes
**Caso de Uso:**
Permitir visualizar as avaliações recebidas por um usuário.

**História de Usuário:**
Como usuário da plataforma, quero consultar as avaliações de outro usuário, para avaliar sua confiabilidade antes de interagir.

**Regras de Negócio:**
* O sistema deve retornar todas as avaliações associadas ao usuário.

## 2. Autenticação

### 2.1 POST /auth/login
**Caso de Uso:**
Permitir que um usuário autenticado acesse a plataforma.

**História de Usuário:**
Como usuário cadastrado, quero fazer login com minhas credenciais, para acessar as funcionalidades protegidas da plataforma.

**Regras de Negócio:**
* O usuário deve informar email e senha.
* O sistema deve validar as credenciais.
* Caso sejam válidas, deve gerar um token de autenticação.

### 2.2 POST /auth/logout
**Caso de Uso:**
Permitir que o usuário encerre sua sessão.

**História de Usuário:**
Como usuário autenticado, quero encerrar minha sessão, para proteger minha conta ao sair da plataforma.

**Regras de Negócio:**
* O token do usuário deve ser invalidado.

### 2.3 POST /auth/refresh-token
**Caso de Uso:**
Permitir renovar o token de autenticação.

**História de Usuário:**
Como usuário autenticado, quero renovar meu token de acesso, para continuar usando a plataforma sem precisar fazer login novamente a todo momento.

**Regras de Negócio:**
* O usuário deve fornecer um token válido.
* O sistema deve gerar um novo token.

### 2.4 POST /auth/esqueci-senha
**Caso de Uso:**
Permitir solicitar recuperação de senha.

**História de Usuário:**
Como usuário que perdeu acesso à conta, quero solicitar a recuperação de senha, para redefinir meu acesso com segurança.

**Regras de Negócio:**
* O usuário deve informar o e-mail cadastrado.
* O sistema deve enviar instruções de recuperação.

### 2.5 PUT /auth/redefinir-senha
**Caso de Uso:**
Permitir redefinir a senha do usuário.

**História de Usuário:**
Como usuário em processo de recuperação, quero redefinir minha senha, para voltar a acessar minha conta com segurança.

**Regras de Negócio:**
* A nova senha deve seguir os critérios de segurança.
* A senha deve ser armazenada com bcrypt.

## 3. Perfil

### 3.1 GET /perfil
**Caso de Uso:**
Permitir que o usuário visualize seu próprio perfil.

**História de Usuário:**
Como usuário autenticado, quero visualizar meu próprio perfil, para conferir meus dados cadastrados e minha situação na plataforma.

**Regras de Negócio:**
* A rota exige autenticação.
* O sistema retorna os dados do usuário logado.

### 3.2 PUT /perfil
**Caso de Uso:**
Permitir atualizar o perfil do usuário logado.

**História de Usuário:**
Como usuário autenticado, quero atualizar meu perfil, para manter minhas informações pessoais corretas e úteis para outras interações.

**Regras de Negócio:**
* O usuário deve estar autenticado.
* Os dados enviados devem ser validados.

### 3.3 DELETE /perfil
**Caso de Uso:**
Permitir desativar a conta do usuário.

**História de Usuário:**
Como usuário autenticado, quero desativar minha conta, para interromper meu uso da plataforma sem necessariamente apagar todo o histórico.

**Regras de Negócio:**
* A conta deve ter sua situação alterada.

## 4. Categorias

### 4.1 GET /categorias
**Caso de Uso:**
Lista de categorias disponíveis.

**História de Usuário:**
Como usuário da plataforma, quero listar as categorias disponíveis, para classificar ou encontrar itens com mais facilidade.

**Regras de Negócio:**
* Deve retornar todas as categorias cadastradas.

### 4.2 GET /categorias/:id
**Caso de Uso:**
Consultar uma categoria específica.

**História de Usuário:**
Como usuário da plataforma, quero consultar uma categoria específica, para entender melhor a classificação associada a um item.

**Regras de Negócio:**
* O sistema deve buscar a categoria pelo ID.

### 4.3 POST /categorias
**Caso de Uso:**
Criar nova categoria.

**História de Usuário:**
Como administrador, quero criar novas categorias, para organizar melhor os itens cadastrados no sistema.

**Regras de Negócio:**
* Apenas administradores podem criar categorias.

### 4.4 PUT /categorias/:id
**Caso de Uso:**
Atualizar categoria.

**História de Usuário:**
Como administrador, quero atualizar uma categoria existente, para corrigir ou melhorar a organização do catálogo.

**Regras de Negócio:**
* Apenas administradores podem atualizar categorias.

### 4.5 DELETE /categorias/:id
**Caso de Uso:**
Remover categoria.

**História de Usuário:**
Como administrador, quero remover categorias inadequadas ou obsoletas, para manter o catálogo consistente.

**Regras de Negócio:**
* Apenas administradores podem remover categorias.

## 5. Itens de Doação

### 5.1 POST /itens
**Caso de Uso:**
Permitir que um usuário cadastre um item para doação.

**História de Usuário:**
Como usuário autenticado, quero cadastrar um item para doação, para disponibilizá-lo a outras pessoas da comunidade.

**Regras de Negócio:**
* O usuário deve estar autenticado.
* O item deve possuir título, descrição e categoria.

### 5.2 GET /itens
**Caso de Uso:**
Listar itens disponíveis para doação.

**História de Usuário:**
Como usuário da plataforma, quero listar os itens disponíveis, para encontrar doações de meu interesse.

**Regras de Negócio:**
* O sistema deve retornar itens disponíveis.

### 5.3 GET /itens/:id
**Caso de Uso:**
Consultar um item específico.

**História de Usuário:**
Como usuário da plataforma, quero consultar um item específico, para ver seus detalhes antes de demonstrar interesse.

**Regras de Negócio:**
* O sistema deve buscar o item pelo ID.

### 5.4 PUT /itens/:id
**Caso de Uso:**
Atualizar um item.

**História de Usuário:**
Como doador responsável pelo item, quero atualizar um anúncio, para corrigir ou complementar suas informações.

**Regras de Negócio:**
* Apenas o dono do item pode atualizar.

### 5.5 PATCH /itens/:id
**Caso de Uso:**
Atualizar parcialmente um item.

**História de Usuário:**
Como doador responsável pelo item, quero alterar apenas parte do anúncio, para fazer ajustes rápidos sem reenviar tudo.

**Regras de Negócio:**
* Apenas campos enviados devem ser atualizados.

### 5.6 DELETE /itens/:id
**Caso de Uso:**
Remover o item da plataforma.

**História de Usuário:**
Como doador responsável pelo item, quero remover meu anúncio, para deixar de disponibilizá-lo na plataforma.

**Regras de Negócio:**
* Apenas o dono pode remover.

### 5.7 PUT /itens/:id/confirmar-entrega
**Caso de Uso:**
Confirmar que o item foi entregue ao interessado.

**História de Usuário:**
Como doador responsável pelo item, quero confirmar a entrega da doação, para registrar a conclusão correta do processo.

**Regras de Negócio:**
* O item deve estar reservado.

### 5.8 PUT /itens/:id/cancelar
**Caso de Uso:**
Cancelar uma doação.

**História de Usuário:**
Como doador responsável pelo item, quero cancelar uma doação, para interromper o processo quando ele não puder ser concluído.

**Regras de Negócio:**
* O status do item deve ser alterado.

### 5.9 GET /itens/:id/interesses
**Caso de Uso:**
Visualizar interessados em um item.

**História de Usuário:**
Como doador responsável pelo item, quero visualizar os interessados no meu anúncio, para decidir quem poderá receber a doação.

**Regras de Negócio:**
* Apenas o dono do item pode visualizar.

## 6. Interesses

### 6.1 POST /interesses
**Caso de Uso:**
Permitir que um usuário autenticado manifeste interesse em um item de doação disponível.

**História de Usuário:**
Como usuário autenticado, quero manifestar interesse em um item disponível, para tentar recebê-lo do doador.

**Regras de Negócio:**
* O usuário deve estar autenticado e com situação `ATIVO`.
* O item deve existir e estar com status `DISPONIVEL`.
* O usuário não pode manifestar interesse em item próprio.
* Um mesmo usuário não pode manifestar interesse mais de uma vez no mesmo item enquanto houver interesse ativo.
* O interessado pode enviar uma mensagem opcional ao doador.
* Ao registrar o interesse, o sistema deve criar o registro com status `PENDENTE`.
* O sistema deve armazenar a data da manifestação de interesse.
* O total_interesses do item deve ser incrementado.
* O item deve ser adicionado à lista de interesses do usuário.
* O doador deve ser notificado de que houve uma nova manifestação de interesse.

### 6.2 GET /interesses
**Caso de Uso:**
Permitir que o usuário autenticado visualize a lista de interesses que realizou na plataforma.

**História de Usuário:**
Como usuário autenticado, quero visualizar meus interesses registrados, para acompanhar minhas solicitações e seu andamento.

**Regras de Negócio:**
* A rota exige autenticação.
* Devem ser retornados apenas os interesses do usuário autenticado.
* A listagem pode ser filtrada por status, item ou data, quando aplicável.
* Cada registro deve exibir, no mínimo, o item relacionado, o status do interesse, a data da manifestação e a resposta do doador, quando houver.
* Interesses com status `RECUSADO`, `CANCELADO` e `EXPIRADO` podem continuar visíveis para fins de histórico.

### 6.3 GET /interesses/:id
**Caso de Uso:**
Permitir a consulta detalhada de um interesse específico.

**História de Usuário:**
Como interessado, doador do item ou administrador, quero consultar um interesse específico, para acompanhar seus detalhes e status atual.

**Regras de Negócio:**
* A rota exige autenticação.
* O acesso deve ser permitido apenas ao usuário interessado, ao doador dono do item ou ao administrador.
* A resposta deve apresentar os dados do item, do interessado, do doador, a mensagem enviada, o status atual e as datas relacionadas ao fluxo do interesse.
* Caso o interesse não exista, o sistema deve retornar erro apropriado.

### 6.4 PUT /interesses/:id/aceitar
**Caso de Uso:**
Permitir que o doador aceite um interessado para um item anunciado.

**História de Usuário:**
Como doador responsável pelo item, quero aceitar um interesse pendente, para reservar a doação para a pessoa escolhida.

**Regras de Negócio:**
* Apenas o doador responsável pelo item pode aceitar um interesse.
* O interesse deve estar com status `PENDENTE`.
* O item relacionado deve estar com status `DISPONIVEL`.
* Ao aceitar, o sistema deve alterar o status do interesse para `ACEITO`.
* O sistema deve registrar a data da resposta do doador.
* O item deve ter seu status alterado para `RESERVADO`.
* O campo interesse_aceito_id do item deve ser preenchido com o ID do interesse aceito.
* Todos os demais interesses pendentes do mesmo item devem ser automaticamente alterados para `RECUSADO`.
* O interessado aceito deve ser notificado.
* Os demais interessados recusados também devem ser notificados.

### 6.5 PUT /interesses/:id/recusar
**Caso de Uso:**
Permitir que o doador recuse a solicitação de interesse de um usuário.

**História de Usuário:**
Como doador responsável pelo item, quero recusar um interesse pendente, para seguir com outros interessados ou encerrar aquela solicitação.

**Regras de Negócio:**
* Apenas o doador responsável pelo item pode recusar um interesse.
* O interesse deve estar com status `PENDENTE`.
* Ao recusar, o sistema deve alterar o status do interesse para `RECUSADO`.
* O sistema deve registrar a data da resposta.
* O item deve permanecer `DISPONIVEL`, desde que nenhum outro interesse tenha sido aceito.
* O usuário interessado deve ser notificado da recusa.

### 6.6 DELETE /interesses/:id
**Caso de Uso:**
Permitir o cancelamento de um interesse pelo usuário interessado.

**História de Usuário:**
Como usuário interessado, quero cancelar meu interesse em um item, para desistir da solicitação quando não fizer mais sentido.

**Regras de Negócio:**
* A rota exige autenticação.
* Apenas o próprio usuário que manifestou interesse pode cancelar seu interesse.
* Interesses com status `PENDENTE` podem ser cancelados pelo interessado.
* Caso o interesse cancelado esteja com status `ACEITO`, o sistema deve alterar o status para `CANCELADO` e desfazer a reserva do item.
* Ao cancelar um interesse aceito, o item deve voltar para o status `DISPONIVEL`, desde que não exista outro interesse aceito para ele.
* O sistema deve registrar a data de cancelamento.
* O doador deve ser notificado quando houver cancelamento de um interesse aceito.

## 7. Avaliações

### 7.1 POST /avaliacoes
**Caso de Uso:**
Permitir que um usuário avalie outro usuário após uma doação.

**História de Usuário:**
Como usuário que concluiu uma doação, quero avaliar a outra parte, para registrar minha experiência na plataforma.

**Regras de Negócio:**
* O usuário deve estar autenticado.
* A avaliação deve possuir:
  * nota
  * comentário (opcional).
* A avaliação deve estar relacionada a um item de doação.

### 7.2 GET /avaliacoes
**Caso de Uso:**
Permitir visualizar avaliações registradas.

**História de Usuário:**
Como usuário da plataforma, quero visualizar avaliações registradas, para analisar a reputação dos participantes.

**Regras de Negócio:**
* O sistema deve retornar a lista de avaliações cadastradas.

### 7.3 GET /avaliacoes/:id
**Caso de Uso:**
Permitir consultar uma avaliação específica.

**História de Usuário:**
Como usuário da plataforma, quero consultar uma avaliação específica, para entender o contexto e o conteúdo daquele feedback.

**Regras de Negócio:**
* O sistema deve buscar a avaliação pelo ID.

### 7.4 PUT /avaliacoes/:id
**Caso de Uso:**
Permitir atualizar uma avaliação.

**História de Usuário:**
Como autor de uma avaliação, quero atualizá-la, para corrigir ou complementar meu feedback após a doação.

**Regras de Negócio:**
* Apenas o autor da avaliação pode editar.

### 7.5 DELETE /avaliacoes/:id
**Caso de Uso:**
Permitir remover uma avaliação.

**História de Usuário:**
Como autor de uma avaliação, quero removê-la, para retirar um feedback publicado anteriormente.

**Regras de Negócio:**
* Apenas o autor da avaliação pode remover.

## 8. Denúncias

### 8.1 POST /denuncias
**Caso de Uso:**
Permitir que um usuário autenticado denuncie um item ou outro usuário da plataforma.

**História de Usuário:**
Como usuário autenticado, quero denunciar um item ou usuário, para informar à administração sobre conteúdo ou comportamento inadequado.

**Regras de Negócio:**
* Apenas usuários com situação `ATIVO` podem criar denúncias.
* A denúncia deve ter um alvo válido, podendo ser um `ITEM` ou um `USUARIO`.
* O motivo da denúncia deve ser obrigatório e seguir os valores padronizados do sistema.
* Os motivos aceitos são: `CONTEUDO_INAPROPRIADO`, `ITEM_PROIBIDO`, `FRAUDE`, `ASSEDIO`, `SPAM` e `OUTRO`.
* A descrição detalhada é opcional.
* Um mesmo usuário não pode denunciar o mesmo item ou usuário mais de uma vez enquanto houver uma denúncia `EM_ANALISE` para o mesmo alvo.
* Ao registrar a denúncia, o sistema deve criar o registro com status `EM_ANALISE`.
* A data da denúncia deve ser armazenada.
* O sistema pode notificar a administração sobre a nova denúncia para análise posterior.

### 8.2 GET /denuncias
**Caso de Uso:**
Permitir que o usuário autenticado visualize as denúncias que realizou.

**História de Usuário:**
Como usuário autenticado, quero visualizar minhas denúncias, para acompanhar o histórico e o andamento das análises administrativas.

**Regras de Negócio:**
* A rota exige autenticação.
* Devem ser retornadas apenas as denúncias registradas pelo usuário autenticado.
* Cada registro deve exibir, no mínimo, o tipo do alvo, o motivo, o status, a data da denúncia e a resposta administrativa, quando houver.
* Denúncias `PROCEDENTE` e `IMPROCEDENTE` devem continuar visíveis para histórico do denunciante.

### 8.3 GET /denuncias/:id
**Caso de Uso:**
Permitir a consulta detalhada de uma denúncia específica.

**História de Usuário:**
Como denunciante responsável ou administrador, quero consultar uma denúncia específica, para ver seus detalhes e o resultado da análise.

**Regras de Negócio:**
* A rota exige autenticação.
* O acesso deve ser permitido ao denunciante responsável pela denúncia ou ao administrador.
* A resposta deve conter o alvo denunciado, o motivo, a descrição, o status, a resposta do administrador, a ação tomada e as datas de denúncia e análise.
* Caso a denúncia não exista, o sistema deve retornar erro apropriado.

### 8.4 PUT /denuncias/:id
**Caso de Uso:**
Permitir a atualização de uma denúncia antes da conclusão da análise administrativa.

**História de Usuário:**
Como autor da denúncia, quero atualizar a denúncia enquanto ela ainda está em análise, para corrigir ou complementar as informações enviadas.

**Regras de Negócio:**
* A rota exige autenticação.
* Apenas o usuário que criou a denúncia pode atualizá-la.
* A atualização só deve ser permitida enquanto a denúncia estiver com status `EM_ANALISE`.
* O tipo de alvo e o alvo denunciado não devem ser alterados após o registro.
* Devem ser atualizados apenas o motivo e a descrição, quando necessário.
* Após a denúncia ser analisada, não deve ser mais possível editá-la.

### 8.5 DELETE /denuncias/:id
**Caso de Uso:**
Permitir a remoção de uma denúncia pelo autor antes da finalização do processo de análise.

**História de Usuário:**
Como autor da denúncia, quero remover a denúncia antes da conclusão da análise, para desistir do registro quando necessário.

**Regras de Negócio:**
* A rota exige autenticação.
* Apenas o usuário que criou a denúncia pode removê-la.
* A exclusão só deve ser permitida enquanto a denúncia estiver com status `EM_ANALISE`.
* Denúncias já concluídas como `PROCEDENTE` ou `IMPROCEDENTE` não devem poder ser removidas pelo usuário.
* A remoção deve ser bloqueada caso a administração já tenha iniciado ou concluído a análise.

## 9. Administração

### 9.1 GET /admin/usuarios
**Caso de Uso:**
Permitir que o administrador visualize todos os usuários cadastrados na plataforma.

**História de Usuário:**
Como administrador, quero listar todos os usuários da plataforma, para acompanhar a base e apoiar ações de moderação.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A listagem deve permitir consulta de usuários independentemente da situação.
* Devem ser exibidos dados relevantes para moderação, como nome, e-mail, cidade, perfil, situação, média de avaliações e total de doações.
* A listagem pode permitir filtros por situação, perfil, cidade e data de cadastro.
* Dados sensíveis devem seguir as regras de segurança da aplicação.

### 9.2 GET /admin/usuarios/:id
**Caso de Uso:**
Permitir que o administrador visualize os detalhes de um usuário específico.

**História de Usuário:**
Como administrador, quero consultar um usuário específico em detalhe, para analisar seu histórico e tomar decisões de moderação.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A resposta deve apresentar os dados cadastrais do usuário, sua situação atual, histórico resumido de itens, interesses, avaliações e denúncias relacionadas, quando aplicável.
* Caso o usuário não exista, o sistema deve retornar erro apropriado.

### 9.3 PUT /admin/usuarios/:id/bloquear
**Caso de Uso:**
Permitir que o administrador suspenda um usuário da plataforma.

**História de Usuário:**
Como administrador, quero bloquear um usuário, para impedir novas ações de contas que violaram regras da plataforma.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A suspensão deve exigir justificativa obrigatória.
* A suspensão pode exigir prazo determinado, armazenado em suspensao_ate.
* Ao bloquear, o sistema deve alterar a situação do usuário para `SUSPENSO`.
* O motivo da suspensão deve ser registrado.
* Usuários suspensos não podem realizar login nem operações protegidas da plataforma.
* O usuário deve ser notificado da suspensão aplicada.
* A suspensão pode ocorrer, por exemplo, após denúncia procedente ou violação dos termos da plataforma.

### 9.4 PUT /admin/usuarios/:id/desbloquear
**Caso de Uso:**
Permitir que o administrador reative um usuário suspenso.

**História de Usuário:**
Como administrador, quero desbloquear um usuário suspenso, para restaurar seu acesso quando a suspensão deixar de ser necessária.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* Apenas usuários com situação `SUSPENSO` podem ser desbloqueados.
* Ao desbloquear, o sistema deve alterar a situação do usuário para `ATIVO`.
* O motivo_suspensao e o prazo de suspensão podem ser limpos ou arquivados, conforme a estratégia adotada pela equipe.
* O usuário deve ser notificado sobre a reativação da conta.

### 9.5 DELETE /admin/usuarios/:id
**Caso de Uso:**
Permitir que o administrador remova ou desative administrativamente um usuário da plataforma.

**História de Usuário:**
Como administrador, quero inativar administrativamente um usuário, para preservar a integridade da plataforma em casos críticos.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A remoção deve preferencialmente ser lógica, alterando a situação do usuário para `INATIVO`.
* Os dados pessoais podem ser anonimizados para preservar privacidade e integridade do sistema.
* Itens ativos do usuário removido devem ser cancelados.
* Caso existam doações em andamento, a remoção deve respeitar as regras de consistência do fluxo ou ser tratada administrativamente com segurança.
* O histórico do sistema pode ser mantido de forma anonimizada para auditoria.

### 9.6 GET /admin/itens
**Caso de Uso:**
Permitir que o administrador visualize todos os itens cadastrados na plataforma.

**História de Usuário:**
Como administrador, quero listar todos os itens cadastrados, para fiscalizar anúncios e apoiar ações de moderação.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A listagem deve exibir itens em qualquer status.
* A consulta pode incluir filtros por categoria, cidade, status, data de cadastro e usuário responsável.
* A resposta deve trazer dados suficientes para moderação, incluindo informações do doador e quantidade de interesses recebidos.

### 9.7 DELETE /admin/itens/:id
**Caso de Uso:**
Permitir que o administrador remova um item da plataforma.

**História de Usuário:**
Como administrador, quero remover um item da plataforma, para agir sobre anúncios inadequados ou irregulares.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* Ao remover, o item deve ter seu status alterado para `CANCELADO`.
* Caso existam interesses ativos no item, os interessados devem ser notificados sobre o cancelamento.
* A remoção administrativa pode ocorrer, por exemplo, em caso de denúncia procedente ou violação das regras da plataforma.
* O sistema deve registrar a ação administrativa realizada sobre o item.

### 9.8 GET /admin/denuncias
**Caso de Uso:**
Permitir que o administrador visualize todas as denúncias registradas na plataforma.

**História de Usuário:**
Como administrador, quero listar todas as denúncias registradas, para analisar prioridades e conduzir a moderação da plataforma.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* A listagem deve exibir denúncias em qualquer status.
* Deve ser possível filtrar por status, tipo de alvo, motivo e data de denúncia.
* A resposta deve apresentar informações suficientes para análise, incluindo denunciante, alvo, motivo, descrição e status atual.

### 9.9 PUT /admin/denuncias/:id/resolver
**Caso de Uso:**
Permitir que o administrador conclua a análise de uma denúncia.

**História de Usuário:**
Como administrador, quero resolver uma denúncia em análise, para registrar o resultado e aplicar a medida administrativa cabível.

**Regras de Negócio:**
* A rota exige autenticação e perfil `ADMINISTRADOR`.
* Apenas denúncias com status `EM_ANALISE` podem ser resolvidas.
* O administrador deve informar o resultado da análise, sendo `PROCEDENTE` ou `IMPROCEDENTE`.
* O sistema deve registrar o administrador responsável pela análise.
* O sistema deve armazenar a resposta administrativa, a ação tomada e a data da análise.
* Quando a denúncia for `PROCEDENTE` e o alvo for um item, o administrador pode remover o item, alterando seu status para `CANCELADO`.
* Quando a denúncia for `PROCEDENTE` e o alvo for um usuário, o administrador pode suspender o usuário, alterando sua situação para `SUSPENSO`.
* Quando a denúncia for `IMPROCEDENTE`, a denúncia deve ser encerrada sem ação punitiva sobre o alvo.
* O denunciante e o denunciado devem ser notificados do resultado da análise.

## 10. Upload de Imagens

### 10.1 POST /uploads
**Caso de Uso:**
Permitir envio de imagem para a plataforma.

**História de Usuário:**
Como usuário autenticado, quero enviar imagens para a plataforma, para ilustrar meus anúncios e melhorar sua apresentação.

**Regras de Negócio:**
* O usuário deve estar autenticado.
* O arquivo deve ser validado.

### 10.2 DELETE /uploads/:id
**Caso de Uso:**
Remover uma imagem enviada.

**História de Usuário:**
Como dono da imagem ou administrador, quero remover uma imagem enviada, para excluir arquivos inadequados, incorretos ou desnecessários.

**Regras de Negócio:**
* Apenas o dono ou administrador pode remover.

---
**Total: ~57 rotas possíveis**
