import { evalFunCall, evalNode, evalStr } from './evaluator';
import { Memory } from './memory';
import { BoObject, Fun, Macro, Message, NIL, Str } from './object';

type FuncType = (
  receiver: BoObject | undefined,
  args: BoObject[],
  env: Memory
) => BoObject;

export class BuiltinFunction extends BoObject {
  constructor(public name: string, public fun: FuncType) {
    super();
  }
  call(
    receiver: BoObject | undefined,
    args: BoObject[],
    env: Memory
  ): BoObject {
    return this.fun(receiver, args, env);
  }
  str(): string {
    return this.name;
  }
}

export const FUN = new BuiltinFunction(
  'fun',
  (
    _receiver: BoObject | undefined,
    args: BoObject[],
    env: Memory
  ): BoObject => {
    if (args?.length >= 1) return new Fun(args, env);
    throw new Error(`ERROR fun(args.len===${args?.length}) arg length error`);
  }
);

export const MACRO = new BuiltinFunction(
  'macro',
  (
    _receiver: BoObject | undefined,
    args: BoObject[],
    _env: Memory
  ): BoObject => {
    if (args.length >= 1) return new Macro(args);
    throw new Error(`ERROR macro(args.len===${args.length}) arg length error`);
  }
);

export const MESSAGE = new BuiltinFunction(
  'message',
  (
    _receiver: BoObject | undefined,
    args: BoObject[],
    _env: Memory
  ): BoObject => {
    if (args.length >= 2 && args[0] instanceof Str) {
      const type = args[0].value;
      if (type == '__' && args.length === 2 && args[1] instanceof Str) {
        return new Message(undefined, args[1].value, undefined);
      } else if (type === '_@' && args[1] instanceof Str) {
        return new Message(
          undefined,
          args[1].value,
          args.slice(2, args.length)
        );
      } else if (type === '@_' && args.length === 3 && args[2] instanceof Str) {
        return new Message(args[1], args[2].value, undefined);
      } else if (type === '@@' && args[2] instanceof Str) {
        return new Message(args[1], args[2].value, args.slice(3, args.length));
      }
    }
    throw new Error(
      `ERROR MESSAGE(${args
        .map((e) => {
          e.str();
        })
        .join(',')})`
    );
  }
);

export const EVAL_NODE = new BuiltinFunction(
  'evalNode',
  (
    _receiver: BoObject | undefined,
    args: BoObject[],
    env: Memory
  ): BoObject => {
    if (args.length === 1) return evalNode(evalNode(args[0], env), env);
    throw new Error(
      `ERROR evalNode(args.len===${args.length}) arg length error`
    );
  }
);

export const EVAL_STR = new BuiltinFunction(
  'evalStr',
  (
    _receiver: BoObject | undefined,
    args: BoObject[],
    env: Memory
  ): BoObject => {
    if (args.length === 1 && args[0] instanceof Str) {
      return evalStr(args[0].value, env);
    }
    throw new Error(
      `ERROR evalStr(args.len===${args.length}) arg length error`
    );
  }
);

///////////////////////////////////////////

const evalIf = (mes: Message, env: Memory): BoObject => {
  if (!mes.receiver) throw new Error('ERROR evalIf(no receiver)');
  if (!(mes.args?.length === 1 || mes.args?.length === 2))
    throw new Error('ERROR evalIf(arg length error)');
  const receiver = evalNode(mes.receiver, env);
  const block = receiver !== NIL ? mes.args[0] : mes.args[1] || NIL;
  return evalNode(block, env);
};

const evalPrint = (mes: Message, env: Memory): BoObject => {
  if (!mes.receiver) throw new Error('ERROR evalPrint(no receiver)');
  if (mes.args?.length !== 0)
    throw new Error('ERROR evalPrint(arg length error)');
  const result = evalNode(mes.receiver, env);
  console.log(result.str());
  return result;
};

const evalClone = (mes: Message, env: Memory): BoObject => {
  if (!mes.receiver) throw new Error('ERROR evalClone(no receiver)');
  if (mes.args?.length !== 0)
    throw new Error('ERROR evalClone(arg length error)');
  return evalNode(mes.receiver, env).clone();
};

const evalDoWhile = (mes: Message, env: Memory): BoObject => {
  if (!mes.receiver) throw new Error('ERROR evalDoWhile(no receiver)');
  if (!(mes.receiver instanceof Message)) {
    throw new Error('ERROR evalDoWhile(receiver is not fun)');
  }
  if (mes.args?.length !== 1)
    throw new Error('ERROR evalDoWhile(arg length error)');
  const condition = evalNode(mes.receiver, env);
  if (!(condition instanceof Fun)) {
    throw new Error('ERROR evalDoWhile()');
  }

  let result: BoObject = NIL;
  while (evalFunCall(undefined, condition, [], condition.createdEnv) !== NIL) {
    result = evalNode(mes.args[0], env);
  }
  return result;
};

export const defaultMethodMap: {
  [key: string]: (mes: Message, env: Memory) => BoObject;
} = {
  if: evalIf,
  print: evalPrint,
  clone: evalClone,
  doWhile: evalDoWhile,
};

/*
島川「BinOpはやはりオブジェクト指向の言語です。Pharoに倣って関数オブジェクトにdoWhileメソッドを実装することで、言語仕様を崩壊させることなく言語仕様をコンパクトに維持できるのです。」
関数型言語支持者「（どういうことです！？島川の提案は明らかに、再帰を実装できなかった言い訳。末尾再帰関数によるループ実装というポリシーの後退でしかない・・・。）」
関数型言語支持者「（不完全だったBinOpをオブジェクト指向言語として一応の完成とさせ、末尾再帰関数をschemeで実装し直すための明らかな時間稼ぎ・・・。）」
オブジェクト指向支持者「わかりました。受け入れましょう。」
関数型言語支持者「（まさか、オブジェクト指向支持者にはこれが進歩に見えているのか１？）」
関数型言語支持者「（島川はこの技術的未熟さをオブジェクト指向への進歩として言い張ることで、オブジェクト指向支持者を言いくるめる気だ。）」
関数型言語支持者「（しかし、このような虚構がHapInS社員全員に通用しますか？）」




*/
