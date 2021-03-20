import { AxiosResponse } from 'axios'
import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

const findProductById = async (productId: number): Promise<AxiosResponse<Product>> =>
  await api.get<Product>(`products/${productId}`).catch(() => {
    throw new Error('Erro na alteração de quantidade do produto')
  })

const findStockByProductId = async (productId: number): Promise<AxiosResponse<Stock>> =>
  await api.get<Stock>(`stock/${productId}`).catch(() => {
    throw new Error('Erro na alteração de quantidade do produto')
  })

export const CartProvider = ({ children }: CartProviderProps): JSX.Element => {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await findStockByProductId(productId)
      const productResponse = await findProductById(productId)

      if (productResponse.status !== 404 && stockResponse.status !== 404) {
        const foundProduct = productResponse.data
        const productStock = stockResponse.data

        const product = cart.find(product => product.id === productId)

        if (product) {
          if (!(productStock.amount - product.amount - 1 < 0)) {
            setCart(cart.map(product => {
              return product.id === productId ?
                { ...product, amount: product.amount + 1 } :
                product
            }))
          } else {
            toast.error('Quantidade solicitada fora de estoque')
            throw new Error(`Product ${productId} not found`)
          }
        } else {
          if (!(productStock.amount - 1 < 0)) {
            setCart([...cart, { ...foundProduct, amount: 1 }])
          } else {
            throw new Error('Quantidade solicitada fora de estoque')
          }
        }

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
      } else {
        throw new Error('Quantidade solicitada fora de estoque')
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId)

      if (!product) throw new Error()

      setCart(cart.filter(product => product.id !== productId))
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      await findProductById(productId)
      const { data: productStock } = await findStockByProductId(productId)

      const product = cart.find(product => product.id === productId)

      if (product) {
        if (
          !(productStock.amount - product.amount - amount < 0) ||
          amount < product.amount
        ) {
          setCart(cart.map(product => {
            return product.id === productId ?
              { ...product, amount: amount } :
              product
          }))
        } else {
          throw new Error('Quantidade solicitada fora de estoque')
        }
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    } catch(error) {
      toast.error(error.message)
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
