# Contributing to Kelly OS Bank Reconciliation

Thank you for considering contributing to Kelly OS! This document provides guidelines for contributing to this financial software project.

## 🎯 Code of Conduct

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what is best for the system
- Show empathy towards other contributors

## 🔐 Security

### Reporting Security Issues

**DO NOT** create public GitHub issues for security vulnerabilities.

Instead, email security details to: [your-security-email]

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fixes (if any)

## 📝 How to Contribute

### 1. Fork the Repository

```bash
git clone https://github.com/your-org/kelly-os
cd kelly-os
git checkout -b feature/your-feature-name
```

### 2. Set Up Development Environment

Follow SETUP.md to configure your local environment.

### 3. Make Your Changes

#### Code Style
- Use TypeScript for all new code
- Follow existing code patterns
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions focused and small

#### Testing
- Test all financial calculations thoroughly
- Verify double-entry accounting balances
- Test with various CSV/Excel formats
- Check edge cases and error handling

### 4. Commit Guidelines

Use conventional commit messages:

```
feat: Add support for Excel 2007 format
fix: Correct balance calculation in ledger
docs: Update API documentation
refactor: Improve matching engine performance
test: Add unit tests for reconciliation
security: Fix SQL injection vulnerability
```

### 5. Submit Pull Request

- Provide clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## 🧪 Testing Requirements

### For All Changes
- [ ] Code compiles without errors
- [ ] No TypeScript errors
- [ ] No linting errors

### For Financial Logic
- [ ] Double-entry balances verified
- [ ] Tested with sample data
- [ ] Edge cases considered
- [ ] Decimal precision maintained
- [ ] Audit trail preserved

### For UI Changes
- [ ] Responsive on mobile/tablet/desktop
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Matches design system
- [ ] Loading states handled
- [ ] Error messages clear

## 📚 Areas for Contribution

### High Priority
- Additional bank statement format parsers
- Enhanced matching algorithms
- Performance optimizations
- Security improvements
- Test coverage

### Medium Priority
- UI/UX enhancements
- Additional reports
- Export functionality
- Email notifications
- Multi-currency support

### Documentation
- Code examples
- Tutorial videos
- API documentation
- Deployment guides

## 🚫 What Not to Submit

- Breaking changes without discussionChanges that compromise security
- Hardcoded credentials or secrets
- Unnecessary dependencies
- Code without proper error handling
- Changes to core accounting logic without review

## 📋 Checklist Before Submitting

- [ ] Code follows project style
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Environment variables documented
- [ ] Breaking changes documented
- [ ] Security implications considered

## 🏗️ Architecture Guidelines

### Database Changes
- Never modify existing migrations
- Create new migration for schema changes
- Ensure backward compatibility
- Test rollback procedures

### API Changes
- Maintain backward compatibility
- Version breaking changes
- Update API documentation
- Add proper error handling

### Accounting Changes
- Maintain double-entry integrity
- Preserve audit trails
- Ensure immutability of ledger
- Document accounting implications

## 🤝 Code Review Process

1. **Automated Checks** - CI/CD pipeline runs tests
2. **Security Review** - Security-sensitive changes reviewed
3. **Financial Review** - Accounting logic verified
4. **Code Review** - At least one maintainer reviews
5. **Testing** - Manual testing if needed
6. **Merge** - Squash and merge to main

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create a GitHub Issue
- **Features**: Start with a Discussion first
- **Security**: Email security team

## 🎓 Learning Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Double-Entry Accounting](https://en.wikipedia.org/wiki/Double-entry_bookkeeping)
- [OWASP Security Guide](https://owasp.org/)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make Kelly OS better!** 🙏

Your contributions help businesses manage their finances more effectively.
