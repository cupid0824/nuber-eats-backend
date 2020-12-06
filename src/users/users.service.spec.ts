import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Verification } from "./entities/verification.entity";
import { User } from "./entities/user.entity";
import { UserService } from "./users.service"
import { JwtService } from "src/jwt/jwt.service";
import { MailService } from "src/mail/mail.service";
import { Repository } from "typeorm";

const mockRepository = () => ({
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockJwtService = {
  sign: jest.fn(()=>'token'),
  verify: jest.fn(), 
}

const mockMailService = {
  sendVerificationEmail: jest.fn()
}

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('UserService', () => {
  let service: UserService;
  let mailService: MailService;
  let jwtService: JwtService;
  let usersRepository: MockRepository<User>;
  let verificationsRepository: MockRepository<Verification>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService, 
        {
          provide: getRepositoryToken(User), 
          useValue: mockRepository()
        },
        {
          provide: getRepositoryToken(Verification), 
          useValue: mockRepository()
        }, 
        {
          provide: MailService, 
          useValue: mockMailService
        },
        {
          provide: JwtService, 
          useValue: mockJwtService
        },            
      ], 
    }).compile();
    service = module.get<UserService>(UserService);
    mailService = module.get<MailService>(MailService);
    jwtService =module.get<JwtService>(JwtService);
    usersRepository = module.get(getRepositoryToken(User));
    verificationsRepository = module.get(getRepositoryToken(Verification));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'test@test.com',
      password: 'test',
      role: 0,
    }
    it('should fail if user exists', async() => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'test@test.com'
      });
      const result = await service.createAccount(createAccountArgs);
      expect(result).toMatchObject({
        ok: false, 
        error: 'There is a user with that email already'
      })
    });
    it('should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined);
      usersRepository.create.mockReturnValue(createAccountArgs);
      usersRepository.save.mockReturnValue(createAccountArgs);
      verificationsRepository.create.mockReturnValue({
        user: createAccountArgs
      });
      verificationsRepository.save.mockResolvedValue({
        code: 'code'
      });
      const result = await service.createAccount(createAccountArgs);
      
      expect(usersRepository.create).toHaveBeenCalledTimes(1);
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs);
      
      expect(usersRepository.save).toHaveBeenCalledTimes(1);
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs);
      
      expect(verificationsRepository.create).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs
      });

      expect(verificationsRepository.save).toHaveBeenCalledTimes(1);
      expect(verificationsRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs
      });

      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String), 
        expect.any(String),
      );
      expect(result).toEqual({ok: true});
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.createAccount(createAccountArgs);
      expect(result).toEqual({ok: false, error: "couldn't create account"})
    });
  });

  describe('login', () => {
    const loginArgs = {
      email: 'test@test.com',
      password: 'test',
    }

    it('should fail if user dose not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);
      const result = await service.login(loginArgs);
      expect(result).toMatchObject({ ok: false, error: 'User not found!' });
    });

    it('should fail if password is wrong', async () => {
      const mockedUser = {
        checkPassword: jest.fn(() =>Promise.resolve(false)), 
      } 
      usersRepository.findOne.mockResolvedValue(mockedUser); 
      const result = await service.login(loginArgs);
      expect(result).toMatchObject({ ok: false, error: 'Wrong Password!'});
    });

    it('should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() =>Promise.resolve(true)), 
      } 
      usersRepository.findOne.mockResolvedValue(mockedUser)
      const result = await service.login(loginArgs);
      expect(jwtService.sign).toHaveBeenCalledTimes(1);
      expect(jwtService.sign).toHaveBeenCalledWith(expect.any(Number));
      expect(result).toEqual({ ok: true, error: 'No error', token: 'token' });
    });

    it('should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error());
      const result = await service.login(loginArgs);
      expect(result).toEqual({ ok: false, error: "Can't log user in" });
    });
  });

  describe('findById', () => {
    const findByIdArgs = { id: 1 };
    it('should find an existing user', async () => {
      usersRepository.findOneOrFail.mockResolvedValue(findByIdArgs);
      const result = await service.findById(1);
      expect(result).toEqual({ok: true, user: findByIdArgs})
    });

    it('should fail if no user is found', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error());
      const result = await service.findById(1);
      expect(result).toEqual({ok: false, error: "User not found."})
    });
  });

  describe('editProfile', () => {
    const editProfileArgs ={
      email: 'test@test.com',
      password: 'test',
    };
    const oldUser = {
      id: 1,
      email: '',
      password: '',
      role: 0
    }
    it('should chang email', async () => {
      usersRepository.findOne.mockResolvedValue(oldUser);
      verificationsRepository.create.mockReturnValue({
        user: editProfileArgs
      });
      verificationsRepository.save.mockResolvedValue({
        code: 'code'
      });
      const result = await service.editProfile(oldUser.id, editProfileArgs)
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        );
      expect(result).toEqual({ ok: true });
    })
  });
  it.todo('verifyEmail');
  it.todo('getAllUsers');
});