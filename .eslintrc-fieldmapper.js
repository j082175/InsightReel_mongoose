/**
 * 🛡️ FieldMapper 강제 사용을 위한 ESLint 커스텀 규칙
 */

module.exports = {
  rules: {
    'no-hardcoded-fields': {
      create(context) {
        // 하드코딩 금지 필드 목록
        const FORBIDDEN_FIELDS = [
          'likes', 'views', 'title', 'channelName', 'platform',
          'commentsCount', 'thumbnailUrl', 'uploadDate', 'url'
        ];

        return {
          MemberExpression(node) {
            if (node.property && node.property.name) {
              const fieldName = node.property.name;
              
              if (FORBIDDEN_FIELDS.includes(fieldName)) {
                context.report({
                  node,
                  message: `🚨 하드코딩된 필드 "${fieldName}" 사용 금지! FieldMapper.get('${fieldName.toUpperCase()}') 사용하세요.`,
                  fix(fixer) {
                    return fixer.replaceText(
                      node,
                      `${context.getSourceCode().getText(node.object)}[FieldMapper.get('${fieldName.toUpperCase()}')]`
                    );
                  }
                });
              }
            }
          },

          Property(node) {
            if (node.key && node.key.name) {
              const fieldName = node.key.name;
              
              if (FORBIDDEN_FIELDS.includes(fieldName)) {
                context.report({
                  node,
                  message: `🚨 하드코딩된 키 "${fieldName}" 사용 금지! [FieldMapper.get('${fieldName.toUpperCase()}')] 사용하세요.`
                });
              }
            }
          }
        };
      }
    }
  }
};